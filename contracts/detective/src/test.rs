extern crate std;

use super::*;
use soroban_sdk::testutils::EnvTestConfig;
use soroban_sdk::testutils::{Address as _, MockAuth, MockAuthInvoke};
use soroban_sdk::IntoVal;

/// Env de pruebas sin archivos de snapshot (evita ruido en la terminal).
fn nuevo_env() -> Env {
    Env::new_with_config(EnvTestConfig { capture_snapshot_at_drop: false })
}

fn desplegar(env: &Env) -> (Address, DetectiveContractClient<'_>) {
    let dueno = Address::generate(env);
    let id = env.register(DetectiveContract, (&dueno,));
    (dueno, DetectiveContractClient::new(env, &id))
}

#[test]
fn tu_ficha_es_valida() {
    let env = nuevo_env();
    let (dueno, detective) = desplegar(&env);
    let ficha = detective.ficha();

    assert!(
        !NOMBRE.is_empty() && NOMBRE.len() <= 32,
        "NOMBRE debe tener entre 1 y 32 bytes (las tildes y la ñ cuentan doble)"
    );
    assert!(!PLACA.is_empty() && PLACA.len() <= 16, "PLACA debe tener entre 1 y 16 bytes");
    assert!(!GRITO.is_empty() && GRITO.len() <= 120, "GRITO debe tener entre 1 y 120 bytes");
    assert_eq!(ficha.dueno, dueno);
    assert_eq!(ficha.cumbres, 0);

    std::println!("\n  🕵️  Ficha de detective");
    std::println!("     Nombre: {NOMBRE}");
    std::println!("     Placa:  {PLACA}");
    std::println!("     Grito:  {GRITO}");
    if NOMBRE == "Detective Sin Nombre" || PLACA == "AQP-000" {
        std::println!("\n  ✏️  Aún tienes los valores de ejemplo: cámbialos en contracts/detective/src/lib.rs (TODO 1 y 2)\n");
    }
}

#[test]
fn firmar_cumbre_suma_uno() {
    let env = nuevo_env();
    env.mock_all_auths();
    let (_, detective) = desplegar(&env);

    assert_eq!(detective.firmar_cumbre(), 1);
    assert_eq!(detective.firmar_cumbre(), 2);
    assert_eq!(detective.ficha().cumbres, 2);
}

#[test]
fn solo_el_dueno_firma_la_cumbre() {
    let env = nuevo_env();
    let (_, detective) = desplegar(&env);
    let intruso = Address::generate(&env);

    // Un intruso intenta firmar en tu nombre: el contrato lo rechaza.
    let res = detective
        .mock_auths(&[MockAuth {
            address: &intruso,
            invoke: &MockAuthInvoke {
                contract: &detective.address,
                fn_name: "firmar_cumbre",
                args: ().into_val(&env),
                sub_invokes: &[],
            },
        }])
        .try_firmar_cumbre();
    assert!(res.is_err());
    assert_eq!(detective.ficha().cumbres, 0);
}
