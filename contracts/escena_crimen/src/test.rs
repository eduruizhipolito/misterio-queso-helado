extern crate std;

use super::*;
use detective::{DetectiveContract, DetectiveContractClient};
use soroban_sdk::testutils::{Address as _, Ledger, MockAuth, MockAuthInvoke};
use soroban_sdk::{bytesn, symbol_short, IntoVal};

const SAL: &str = "sal-de-prueba";

struct Caso<'a> {
    env: Env,
    admin: Address,
    escena: EscenaCrimenClient<'a>,
}

fn s(env: &Env, t: &str) -> String {
    String::from_str(env, t)
}

/// Despliega la escena con culpable `gama` (sospechosos de prueba, no los del caso real), 4 pistas y 5 testimonios.
fn caso<'a>() -> Caso<'a> {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let hash = hash_de(&env, &symbol_short!("gama"), &s(&env, SAL));
    let id = env.register(EscenaCrimen, (&admin, &hash, s(&env, SAL)));
    let escena = EscenaCrimenClient::new(&env, &id);

    for (n, t) in ["la puerta", "el clima", "el taxi", "el pañuelo"].iter().enumerate() {
        escena.cargar_pista(&admin, &(n as u32 + 1), &s(&env, t));
    }
    for id in ["beta", "gama", "alfa", "delta", "omega"] {
        escena.cargar_testimonio(&admin, &Symbol::new(&env, id), &s(&env, id));
    }
    Caso { env, admin, escena }
}

/// Crea un detective: cuenta + su propio contrato Detective, y lo registra.
fn detective(c: &Caso) -> Address {
    let cuenta = Address::generate(&c.env);
    let contrato = c.env.register(DetectiveContract, (&cuenta,));
    c.escena.registrar(&cuenta, &contrato);
    cuenta
}

fn sym(env: &Env, t: &str) -> Symbol {
    Symbol::new(env, t)
}

// ── Hash ────────────────────────────────────────────────────────────────────

#[test]
fn hash_coincide_con_sha256_fuera_de_la_cadena() {
    let env = Env::default();
    // node -e "crypto.createHash('sha256').update('gama'+'sal-de-prueba').digest('hex')"
    let esperado = bytesn!(&env, 0x9add17dccbe908833b9e5295c657731ed02175a455ad92eca73c0c1fe1aff4ba);
    assert_eq!(hash_de(&env, &symbol_short!("gama"), &s(&env, SAL)), esperado);
    assert_ne!(hash_de(&env, &symbol_short!("alfa"), &s(&env, SAL)), esperado);
}

#[test]
fn revelar_verifica_el_hash() {
    let c = caso();
    assert_eq!(c.escena.try_revelar(&c.admin, &sym(&c.env, "alfa")), Err(Ok(Error::HashIncorrecto)));
    assert_eq!(c.escena.culpable_revelado(), None);
    assert_eq!(c.escena.revelar(&c.admin, &sym(&c.env, "gama")), 0);
    assert_eq!(c.escena.culpable_revelado(), Some(sym(&c.env, "gama")));
}

// ── Lecturas ────────────────────────────────────────────────────────────────

#[test]
fn pistas_y_sospechosos() {
    let c = caso();
    assert_eq!(c.escena.ver_sospechosos().len(), 5);
    assert_eq!(c.escena.ver_pista(&2), s(&c.env, "el clima"));
    assert_eq!(c.escena.ver_pistas().len(), 4);
    assert_eq!(c.escena.try_ver_pista(&0), Err(Ok(Error::PistaNoExiste)));
    assert_eq!(c.escena.try_ver_pista(&5), Err(Ok(Error::PistaNoExiste)));
}

// ── Registro (leyendo ficha() del contrato Detective) ───────────────────────

#[test]
fn registro_lee_la_ficha_del_contrato_detective() {
    let c = caso();
    let cuenta = Address::generate(&c.env);
    let contrato = c.env.register(DetectiveContract, (&cuenta,));
    let ficha = DetectiveContractClient::new(&c.env, &contrato).ficha();

    let exp = c.escena.registrar(&cuenta, &contrato);
    assert_eq!(exp.nombre, ficha.nombre);
    assert_eq!(exp.placa, ficha.placa);
    assert_eq!(exp.contrato, contrato);
    assert_eq!(c.escena.ver_expediente(&cuenta), Some(exp));

    assert_eq!(c.escena.try_registrar(&cuenta, &contrato), Err(Ok(Error::YaRegistrado)));
}

#[test]
fn no_te_registras_con_el_contrato_de_otro() {
    let c = caso();
    let otra = Address::generate(&c.env);
    let contrato_ajeno = c.env.register(DetectiveContract, (&otra,));
    let yo = Address::generate(&c.env);
    assert_eq!(c.escena.try_registrar(&yo, &contrato_ajeno), Err(Ok(Error::FichaAjena)));
}

#[test]
fn registrar_con_algo_que_no_es_detective_falla() {
    let c = caso();
    let yo = Address::generate(&c.env);
    let escena = c.escena.address.clone();
    assert_eq!(c.escena.try_registrar(&yo, &escena), Err(Ok(Error::ContratoInvalido)));
}

#[test]
fn sin_registro_no_hay_interrogatorio() {
    let c = caso();
    let yo = Address::generate(&c.env);
    assert_eq!(c.escena.try_interrogar(&yo, &sym(&c.env, "gama")), Err(Ok(Error::NoRegistrado)));
}

// ── Límites ─────────────────────────────────────────────────────────────────

#[test]
fn limite_de_3_interrogatorios() {
    let c = caso();
    let d = detective(&c);
    assert_eq!(c.escena.interrogar(&d, &sym(&c.env, "alfa")), s(&c.env, "alfa"));
    assert_eq!(c.escena.interrogar(&d, &sym(&c.env, "omega")), s(&c.env, "omega"));
    assert_eq!(c.escena.interrogar(&d, &sym(&c.env, "delta")), s(&c.env, "delta"));
    assert_eq!(
        c.escena.try_interrogar(&d, &sym(&c.env, "gama")),
        Err(Ok(Error::SinInterrogatorios))
    );
    assert_eq!(c.escena.ver_expediente(&d).unwrap().interrogatorios, 3);
}

#[test]
fn interrogar_a_alguien_que_no_existe_no_gasta_intento() {
    let c = caso();
    let d = detective(&c);
    assert_eq!(
        c.escena.try_interrogar(&d, &sym(&c.env, "misti")),
        Err(Ok(Error::SospechosoDesconocido))
    );
    assert_eq!(c.escena.ver_expediente(&d).unwrap().interrogatorios, 0);
}

#[test]
fn limite_de_2_acusaciones() {
    let c = caso();
    let d = detective(&c);
    assert!(!c.escena.acusar(&d, &sym(&c.env, "alfa")));
    assert!(!c.escena.acusar(&d, &sym(&c.env, "beta")));
    assert_eq!(c.escena.try_acusar(&d, &sym(&c.env, "gama")), Err(Ok(Error::SinAcusaciones)));
    assert_eq!(c.escena.ranking().len(), 0);
}

#[test]
fn acertar_cierra_tu_caso() {
    let c = caso();
    let d = detective(&c);
    assert!(c.escena.acusar(&d, &sym(&c.env, "gama")));
    assert_eq!(c.escena.try_acusar(&d, &sym(&c.env, "gama")), Err(Ok(Error::YaResuelto)));
}

#[test]
fn despues_de_revelar_no_se_acusa() {
    let c = caso();
    let d = detective(&c);
    c.escena.revelar(&c.admin, &sym(&c.env, "gama"));
    assert_eq!(c.escena.try_acusar(&d, &sym(&c.env, "gama")), Err(Ok(Error::CasoCerrado)));
}

// ── Ranking ─────────────────────────────────────────────────────────────────

#[test]
fn ranking_primer_intento_antes_que_segundo() {
    let c = caso();
    let a = detective(&c);
    let b = detective(&c);
    let d = detective(&c);

    // Ledger 100: A falla su primer intento.
    c.env.ledger().set_sequence_number(100);
    assert!(!c.escena.acusar(&a, &sym(&c.env, "alfa")));
    // Ledger 101: A acierta en su segundo intento (llega PRIMERO al ranking).
    c.env.ledger().set_sequence_number(101);
    assert!(c.escena.acusar(&a, &sym(&c.env, "gama")));
    // Ledger 105: B acierta al primer intento (llega después, pero rankea arriba).
    c.env.ledger().set_sequence_number(105);
    assert!(c.escena.acusar(&b, &sym(&c.env, "gama")));
    // Ledger 110: D acierta al primer intento, después que B.
    c.env.ledger().set_sequence_number(110);
    assert!(c.escena.acusar(&d, &sym(&c.env, "gama")));

    let r = c.escena.ranking();
    assert_eq!(r.len(), 3);
    assert_eq!((r.get(0).unwrap().0, r.get(0).unwrap().2, r.get(0).unwrap().3), (b, 105, 1));
    assert_eq!((r.get(1).unwrap().0, r.get(1).unwrap().2, r.get(1).unwrap().3), (d, 110, 1));
    assert_eq!((r.get(2).unwrap().0, r.get(2).unwrap().2, r.get(2).unwrap().3), (a, 101, 2));
}

// ── Firmas (require_auth) ───────────────────────────────────────────────────

#[test]
fn interrogar_exige_la_firma_del_detective() {
    let c = caso();
    let d = detective(&c);
    let impostor = Address::generate(&c.env);
    let gama = sym(&c.env, "gama");

    // Solo firma el impostor, pero la llamada dice ser del detective `d`.
    let res = c
        .escena
        .mock_auths(&[MockAuth {
            address: &impostor,
            invoke: &MockAuthInvoke {
                contract: &c.escena.address,
                fn_name: "interrogar",
                args: (&d, &gama).into_val(&c.env),
                sub_invokes: &[],
            },
        }])
        .try_interrogar(&d, &gama);
    assert!(res.is_err());
    assert_eq!(c.escena.ver_expediente(&d).unwrap().interrogatorios, 0);
}

#[test]
fn acusar_exige_la_firma_del_detective() {
    let c = caso();
    let d = detective(&c);
    let gama = sym(&c.env, "gama");
    c.env.set_auths(&[]);
    assert!(c.escena.try_acusar(&d, &gama).is_err());
    assert_eq!(c.escena.ranking().len(), 0);
}

#[test]
fn registrar_exige_firma_y_queda_registrada() {
    let c = caso();
    let cuenta = Address::generate(&c.env);
    let contrato = c.env.register(DetectiveContract, (&cuenta,));
    c.escena.registrar(&cuenta, &contrato);
    // La última llamada pidió exactamente la firma de `cuenta` para `registrar`.
    let auths = c.env.auths();
    assert_eq!(auths.len(), 1);
    assert_eq!(auths[0].0, cuenta);
}

#[test]
fn solo_el_admin_carga_pistas() {
    let c = caso();
    let intruso = Address::generate(&c.env);
    assert_eq!(c.escena.try_cargar_pista(&intruso, &1, &s(&c.env, "falsa")), Err(Ok(Error::NoEsAdmin)));
    assert_eq!(c.escena.ver_pista(&1), s(&c.env, "la puerta"));
}
