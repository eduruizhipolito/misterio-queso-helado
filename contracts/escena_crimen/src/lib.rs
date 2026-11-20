#![no_std]
//! 🧀 LA ESCENA DEL CRIMEN - El Misterio del Queso Helado
//!
//! Contrato central del facilitador. Guarda las pistas, los testimonios y el hash del
//! culpable, y hace cumplir las reglas del juego sin que nadie tenga que vigilar:
//!   - máximo 3 interrogatorios por detective
//!   - máximo 2 acusaciones por detective
//!   - cada escritura exige la firma del detective (`require_auth`)
//!
//! Recuerda: todo lo que guarda un contrato es público.

use soroban_sdk::{
    contract, contractclient, contracterror, contractevent, contractimpl, contracttype,
    xdr::ToXdr, Address, Bytes, BytesN, Env, String, Symbol, Vec,
};

pub const MAX_INTERROGATORIOS: u32 = 3;
pub const MAX_ACUSACIONES: u32 = 2;
pub const MAX_NOMBRE: u32 = 32;

// Los datos persistentes viven ~30 días en testnet antes de necesitar "renta".
const TTL_UMBRAL: u32 = 100_000;
const TTL_EXTENDER: u32 = 518_400;

// ─── Interfaz del contrato Detective (el que despliega cada asistente) ──────

/// Misma forma que `Ficha` en contracts/detective. Soroban la codifica como un mapa
/// por nombre de campo, así que basta con que los nombres y tipos coincidan.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Ficha {
    pub nombre: String,
    pub placa: String,
    pub grito: String,
    pub dueno: Address,
    pub cumbres: u32,
}

#[allow(dead_code)]
#[contractclient(name = "DetectiveClient")]
trait Detective {
    fn ficha(env: Env) -> Ficha;
}

// ─── Tipos ──────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    YaRegistrado = 1,
    NoRegistrado = 2,
    SinInterrogatorios = 3,
    SinAcusaciones = 4,
    YaResuelto = 5,
    SospechosoDesconocido = 6,
    PistaNoExiste = 7,
    FichaAjena = 8,
    NombreInvalido = 9,
    CasoCerrado = 10,
    HashIncorrecto = 11,
    ContratoInvalido = 12,
    NoEsAdmin = 13,
}

/// Lo que la escena sabe de cada detective registrado.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Expediente {
    pub nombre: String,
    pub placa: String,
    pub contrato: Address,
    pub interrogatorios: u32,
    pub acusaciones: u32,
    pub resuelto: bool,
}

/// (detective, nombre, ledger del acierto, intento en que acertó)
pub type Ganador = (Address, String, u32, u32);

#[contracttype]
enum Clave {
    Admin,
    HashCulpable,
    Sal,
    Sospechosos,
    Pistas,
    Ranking,
    Revelado,
    Testimonio(Symbol),
    Detective(Address),
}

// ─── Eventos ────────────────────────────────────────────────────────────────

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Registro {
    #[topic]
    pub detective: Address,
    pub nombre: String,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Interrogatorio {
    #[topic]
    pub detective: Address,
    #[topic]
    pub sospechoso: Symbol,
    pub numero: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Acusacion {
    #[topic]
    pub detective: Address,
    #[topic]
    pub sospechoso: Symbol,
    pub acierto: bool,
    pub intento: u32,
    pub ledger: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Revelacion {
    pub culpable: Symbol,
    pub resueltos: u32,
}

// ─── Contrato ───────────────────────────────────────────────────────────────

#[contract]
pub struct EscenaCrimen;

#[contractimpl]
impl EscenaCrimen {
    /// El facilitador despliega la escena con el hash del culpable: sha256(culpable + sal).
    pub fn __constructor(env: Env, admin: Address, hash_culpable: BytesN<32>, sal: String) {
        let s = env.storage().instance();
        s.set(&Clave::Admin, &admin);
        s.set(&Clave::HashCulpable, &hash_culpable);
        s.set(&Clave::Sal, &sal);
        s.set(&Clave::Sospechosos, &Vec::<Symbol>::new(&env));
        s.set(&Clave::Pistas, &Vec::<String>::new(&env));
        s.set(&Clave::Ranking, &Vec::<Ganador>::new(&env));
        extender_instancia(&env);
    }

    // ── Solo admin ──────────────────────────────────────────────────────────

    /// Carga (o reemplaza) la pista número `n`, empezando en 1.
    pub fn cargar_pista(env: Env, admin: Address, n: u32, texto: String) -> Result<(), Error> {
        exigir_admin(&env, &admin)?;
        let mut pistas = pistas(&env);
        if n == 0 || n > pistas.len() + 1 {
            return Err(Error::PistaNoExiste);
        }
        if n == pistas.len() + 1 {
            pistas.push_back(texto);
        } else {
            pistas.set(n - 1, texto);
        }
        env.storage().instance().set(&Clave::Pistas, &pistas);
        extender_instancia(&env);
        Ok(())
    }

    /// Carga el testimonio de un sospechoso. Si es nuevo, entra a la lista de sospechosos.
    pub fn cargar_testimonio(env: Env, admin: Address, sospechoso: Symbol, texto: String) -> Result<(), Error> {
        exigir_admin(&env, &admin)?;
        let mut lista = sospechosos(&env);
        if !lista.contains(&sospechoso) {
            lista.push_back(sospechoso.clone());
            env.storage().instance().set(&Clave::Sospechosos, &lista);
        }
        let clave = Clave::Testimonio(sospechoso);
        env.storage().persistent().set(&clave, &texto);
        extender(&env, &clave);
        extender_instancia(&env);
        Ok(())
    }

    /// Cierra el caso: verifica el culpable contra el hash y lo publica.
    pub fn revelar(env: Env, admin: Address, culpable: Symbol) -> Result<u32, Error> {
        exigir_admin(&env, &admin)?;
        if !es_culpable(&env, &culpable) {
            return Err(Error::HashIncorrecto);
        }
        env.storage().instance().set(&Clave::Revelado, &culpable);
        let resueltos = ranking(&env).len();
        Revelacion { culpable, resueltos }.publish(&env);
        Ok(resueltos)
    }

    // ── Lecturas (gratis: se simulan, no se firman) ─────────────────────────

    pub fn ver_sospechosos(env: Env) -> Vec<Symbol> {
        sospechosos(&env)
    }

    pub fn ver_pista(env: Env, n: u32) -> Result<String, Error> {
        if n == 0 {
            return Err(Error::PistaNoExiste);
        }
        pistas(&env).get(n - 1).ok_or(Error::PistaNoExiste)
    }

    pub fn ver_pistas(env: Env) -> Vec<String> {
        pistas(&env)
    }

    pub fn ver_expediente(env: Env, detective: Address) -> Option<Expediente> {
        env.storage().persistent().get(&Clave::Detective(detective))
    }

    /// Ranking ya ordenado: primero quienes acertaron al primer intento, luego al segundo.
    /// Dentro de cada grupo, por orden de llegada (ledger).
    pub fn ranking(env: Env) -> Vec<(Address, String, u32, u32)> {
        ranking(&env)
    }

    /// `None` mientras el caso siga abierto.
    pub fn culpable_revelado(env: Env) -> Option<Symbol> {
        env.storage().instance().get(&Clave::Revelado)
    }

    // ── Escrituras del detective (firma + fee + queda registrado) ───────────

    /// Te registra leyendo la ficha de TU contrato Detective (llamada entre contratos).
    pub fn registrar(env: Env, detective: Address, contrato: Address) -> Result<Expediente, Error> {
        detective.require_auth();
        let clave = Clave::Detective(detective.clone());
        if env.storage().persistent().has(&clave) {
            return Err(Error::YaRegistrado);
        }

        let ficha = match DetectiveClient::new(&env, &contrato).try_ficha() {
            Ok(Ok(ficha)) => ficha,
            _ => return Err(Error::ContratoInvalido),
        };
        if ficha.dueno != detective {
            return Err(Error::FichaAjena);
        }
        if ficha.nombre.len() == 0 || ficha.nombre.len() > MAX_NOMBRE {
            return Err(Error::NombreInvalido);
        }

        let exp = Expediente {
            nombre: ficha.nombre.clone(),
            placa: ficha.placa,
            contrato,
            interrogatorios: 0,
            acusaciones: 0,
            resuelto: false,
        };
        guardar(&env, &clave, &exp);
        Registro {
            detective,
            nombre: ficha.nombre,
        }
        .publish(&env);
        Ok(exp)
    }

    /// Interroga a un sospechoso y devuelve su testimonio. Máximo 3 por detective.
    pub fn interrogar(env: Env, detective: Address, sospechoso: Symbol) -> Result<String, Error> {
        detective.require_auth();
        let clave = Clave::Detective(detective.clone());
        let mut exp = expediente(&env, &clave)?;
        if exp.interrogatorios >= MAX_INTERROGATORIOS {
            return Err(Error::SinInterrogatorios);
        }
        let testimonio: String = env
            .storage()
            .persistent()
            .get(&Clave::Testimonio(sospechoso.clone()))
            .ok_or(Error::SospechosoDesconocido)?;

        exp.interrogatorios += 1;
        guardar(&env, &clave, &exp);
        Interrogatorio {
            detective,
            sospechoso,
            numero: exp.interrogatorios,
        }
        .publish(&env);
        Ok(testimonio)
    }

    /// Acusa a un sospechoso. Máximo 2 intentos. Devuelve `true` si acertaste.
    /// Un intento fallido NO es un error: la transacción se confirma y el intento cuenta.
    pub fn acusar(env: Env, detective: Address, sospechoso: Symbol) -> Result<bool, Error> {
        detective.require_auth();
        if env.storage().instance().has(&Clave::Revelado) {
            return Err(Error::CasoCerrado);
        }
        let clave = Clave::Detective(detective.clone());
        let mut exp = expediente(&env, &clave)?;
        if exp.resuelto {
            return Err(Error::YaResuelto);
        }
        if exp.acusaciones >= MAX_ACUSACIONES {
            return Err(Error::SinAcusaciones);
        }
        if !sospechosos(&env).contains(&sospechoso) {
            return Err(Error::SospechosoDesconocido);
        }

        exp.acusaciones += 1;
        let intento = exp.acusaciones;
        let ledger = env.ledger().sequence();
        let acierto = es_culpable(&env, &sospechoso);

        if acierto {
            exp.resuelto = true;
            let mut lista = ranking(&env);
            // Insertar después de todos los que acertaron en un intento igual o menor.
            let mut pos = lista.len();
            for (i, g) in lista.iter().enumerate() {
                if g.3 > intento {
                    pos = i as u32;
                    break;
                }
            }
            lista.insert(pos, (detective.clone(), exp.nombre.clone(), ledger, intento));
            env.storage().instance().set(&Clave::Ranking, &lista);
            extender_instancia(&env);
        }

        guardar(&env, &clave, &exp);
        Acusacion {
            detective,
            sospechoso,
            acierto,
            intento,
            ledger,
        }
        .publish(&env);
        Ok(acierto)
    }
}

// ─── Ayudantes ──────────────────────────────────────────────────────────────

fn exigir_admin(env: &Env, admin: &Address) -> Result<(), Error> {
    let guardado: Address = env.storage().instance().get(&Clave::Admin).unwrap();
    if guardado != *admin {
        return Err(Error::NoEsAdmin);
    }
    admin.require_auth();
    Ok(())
}

fn sospechosos(env: &Env) -> Vec<Symbol> {
    env.storage().instance().get(&Clave::Sospechosos).unwrap_or(Vec::new(env))
}

fn pistas(env: &Env) -> Vec<String> {
    env.storage().instance().get(&Clave::Pistas).unwrap_or(Vec::new(env))
}

fn ranking(env: &Env) -> Vec<Ganador> {
    env.storage().instance().get(&Clave::Ranking).unwrap_or(Vec::new(env))
}

fn expediente(env: &Env, clave: &Clave) -> Result<Expediente, Error> {
    env.storage().persistent().get(clave).ok_or(Error::NoRegistrado)
}

fn guardar(env: &Env, clave: &Clave, exp: &Expediente) {
    env.storage().persistent().set(clave, exp);
    extender(env, clave);
}

fn extender(env: &Env, clave: &Clave) {
    env.storage().persistent().extend_ttl(clave, TTL_UMBRAL, TTL_EXTENDER);
}

fn extender_instancia(env: &Env) {
    env.storage().instance().extend_ttl(TTL_UMBRAL, TTL_EXTENDER);
}

/// sha256(bytes del nombre del sospechoso ++ bytes de la sal)
/// Ejemplo: sha256("sospechoso" + "mi-sal") en UTF-8, igual que en Node o en Python.
pub fn hash_de(env: &Env, sospechoso: &Symbol, sal: &String) -> BytesN<32> {
    let mut datos = texto_de_symbol(env, sospechoso);
    datos.append(&sal.to_bytes());
    env.crypto().sha256(&datos).to_bytes()
}

fn es_culpable(env: &Env, sospechoso: &Symbol) -> bool {
    let sal: String = env.storage().instance().get(&Clave::Sal).unwrap();
    let guardado: BytesN<32> = env.storage().instance().get(&Clave::HashCulpable).unwrap();
    hash_de(env, sospechoso, &sal) == guardado
}

/// Un Symbol no se puede convertir a texto directamente dentro del contrato, pero su
/// XDR (ScVal::Symbol) es: [tipo: 4 bytes][largo: 4 bytes][letras...][relleno].
fn texto_de_symbol(env: &Env, s: &Symbol) -> Bytes {
    let xdr = s.clone().to_xdr(env);
    let mut largo = [0u8; 4];
    for (i, b) in largo.iter_mut().enumerate() {
        *b = xdr.get(4 + i as u32).unwrap();
    }
    xdr.slice(8..8 + u32::from_be_bytes(largo))
}

#[cfg(test)]
mod test;
