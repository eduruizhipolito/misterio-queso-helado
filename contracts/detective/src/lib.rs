#![no_std]
//! 🕵️ TU CONTRATO DE DETECTIVE - El Misterio del Queso Helado
//!
//! Este archivo es tuyo. Solo tienes que tocar las 3 líneas marcadas con `// TODO`.
//! Todo lo demás ya funciona: léelo con calma, los comentarios te explican cada parte.
//!
//! Prueba antes de desplegar:  pnpm detective:test
//! Despliega y regístrate:     pnpm detective:ship

use soroban_sdk::{contract, contractevent, contractimpl, contracttype, Address, Env, String};

// ═══════════════════════════════════════════════════════════════════════════
//  ✏️  TU FICHA DE DETECTIVE (cambia estas 3 cosas)
// ═══════════════════════════════════════════════════════════════════════════

// TODO 1: tu nombre de detective (entre 1 y 32 bytes; las tildes y la ñ cuentan doble).
//         Es el nombre que saldrá en el ranking de la pantalla grande.
pub const NOMBRE: &str = "Detective Sin Nombre";

// TODO 2: tu placa de detective, por ejemplo "AQP-054" o "MISTI-7".
pub const PLACA: &str = "AQP-000";

// TODO 3: tu grito de cumbre. Se publica como EVENTO cada vez que firmas la cumbre.
pub const GRITO: &str = "¡Subí al Misti y volví con hambre de queso helado!";

// ═══════════════════════════════════════════════════════════════════════════
//  De aquí para abajo no necesitas cambiar nada (pero léelo: es tu primer contrato)
// ═══════════════════════════════════════════════════════════════════════════

/// Tu ficha pública. La Escena del Crimen la lee cuando te registras.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Ficha {
    pub nombre: String,
    pub placa: String,
    pub grito: String,
    /// La cuenta dueña de este contrato (tú). Solo ella puede firmar la cumbre.
    pub dueno: Address,
    /// Cuántas veces firmaste el libro de la Cumbre del Misti.
    pub cumbres: u32,
}

/// Lo que este contrato guarda en la blockchain. Ojo: TODO lo guardado es público.
#[contracttype]
enum Clave {
    Dueno,
    Cumbres,
}

/// Aviso que el contrato publica al firmar la cumbre. Cualquiera puede escucharlo.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Cumbre {
    #[topic]
    pub dueno: Address,
    pub grito: String,
    pub cumbres: u32,
}

#[contract]
pub struct DetectiveContract;

#[contractimpl]
impl DetectiveContract {
    /// Se ejecuta UNA sola vez, al desplegar. Guarda quién es el dueño.
    pub fn __constructor(env: Env, dueno: Address) {
        env.storage().instance().set(&Clave::Dueno, &dueno);
        env.storage().instance().set(&Clave::Cumbres, &0u32);
    }

    /// LECTURA: devuelve tu ficha. No cambia nada, así que se puede simular gratis.
    pub fn ficha(env: Env) -> Ficha {
        Ficha {
            nombre: String::from_str(&env, NOMBRE),
            placa: String::from_str(&env, PLACA),
            grito: String::from_str(&env, GRITO),
            dueno: dueno(&env),
            cumbres: env.storage().instance().get(&Clave::Cumbres).unwrap_or(0),
        }
    }

    /// ESCRITURA: firma el libro de la Cumbre del Misti (contador +1).
    /// Cambia el estado, así que necesita tu firma y paga un fee.
    pub fn firmar_cumbre(env: Env) -> u32 {
        let dueno = dueno(&env);
        // El contrato exige que el dueño firme. Nadie más puede sumar cumbres por ti.
        dueno.require_auth();

        let cumbres: u32 = env.storage().instance().get(&Clave::Cumbres).unwrap_or(0) + 1;
        env.storage().instance().set(&Clave::Cumbres, &cumbres);

        Cumbre {
            dueno,
            grito: String::from_str(&env, GRITO),
            cumbres,
        }
        .publish(&env);

        cumbres
    }
}

fn dueno(env: &Env) -> Address {
    env.storage().instance().get(&Clave::Dueno).unwrap()
}

#[cfg(test)]
mod test;
