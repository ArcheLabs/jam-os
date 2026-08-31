#![no_std]
#![allow(static_mut_refs)]
#[cfg(not(target_env = "polkavm"))]
compile_error!("generated service must be built with the official PolkaVM target");

pub const JAMSCRIPT_RUNTIME_REFINE_INPUT_VERSION: u8 = 1;

use service_runtime_core::{
    ManagedStateCommitmentV1, RuntimeRefineInputV1, RuntimeRefineOutputV1, StateRoot,
    MANAGED_STATE_COMMITMENT_KEY_V1,
};
#[repr(C)]
pub struct RefineOutput { pub data: *const u8, pub size: usize }

extern "C" {
    fn minijam_payload(output: *mut u8, capacity: usize, output_size: *mut usize) -> u32;
    fn minijam_result_count() -> usize;
    fn minijam_result(index: usize, output: *mut u8, capacity: usize, output_size: *mut usize) -> u32;
    fn minijam_storage_read(key: *const u8, key_size: usize, output: *mut u8, capacity: usize, output_size: *mut usize) -> u32;
    fn minijam_storage_write(key: *const u8, key_size: usize, value: *const u8, value_size: usize) -> u32;
}

static mut INPUT: [u8; 1048576] = [0; 1048576];
static mut RESULT: [u8; 2097152] = [0; 2097152];
static mut OUTPUT: [u8; 2097152] = [0; 2097152];

mod generated_application_impl {
use service_runtime_core::{ScriptActionResultV1, ServiceApplication, ServiceKeyV1, StateAccessError};

const SERVICE_KEY: ServiceKeyV1 = ServiceKeyV1::new([171, 0, 49, 250, 194, 209, 44, 178, 31, 10, 83, 159, 152, 96, 213, 240, 203, 154, 78, 28, 171, 160, 17, 7, 25, 145, 178, 11, 53, 125, 230, 110]);
const NETWORK_DOMAIN: [u8; 32] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

unsafe extern "C" {
    fn jamscript_scriptc_service_init();
    fn jamscript_scriptc_claim_entry_v1(payload: *const u8, payload_len: usize, sender: *const u8, sender_len: usize, state: *const u8, state_len: usize, output: *mut *const u8, output_len: *mut usize);
    fn jamscript_scriptc_bind_entry_v1(payload: *const u8, payload_len: usize, sender: *const u8, sender_len: usize, state: *const u8, state_len: usize, output: *mut *const u8, output_len: *mut usize);
}

fn application_key_allowed(key: &[u8]) -> bool {
    if key.len() < 3 || key[0] != service_runtime_core::APPLICATION_KEY_CLASS_V1 { return false; }
    let namespace_len = u16::from_le_bytes([key[1], key[2]]) as usize;
    let Some(namespace) = key.get(3..3usize.saturating_add(namespace_len)) else { return false; };
    namespace == &[106, 110, 115, 46, 110, 97, 109, 101, 115, 47, 118, 49]
}

fn apply_script_result(
    context: &mut service_runtime_core::ExecutionContext<'_>,
    result: ScriptActionResultV1,
) -> Result<(), StateAccessError> {
    match result {
        ScriptActionResultV1::Applied(diff) => {
            for change in diff.changes {
                if !application_key_allowed(&change.key) { return Err(StateAccessError::ReservedKey); }
                match change.value {
                    Some(value) => context.state().set(&change.key, &value)?,
                    None => context.state().delete(&change.key)?,
                }
            }
            Ok(())
        }
        ScriptActionResultV1::Abort(code) => Err(StateAccessError::ApplicationFailed(code)),
        ScriptActionResultV1::NeedState(key) => Err(StateAccessError::NeedState(key)),
        ScriptActionResultV1::Fatal(code) => Err(StateAccessError::ApplicationFailed(code)),
    }
}

fn execute_scriptc(
    context: &mut service_runtime_core::ExecutionContext<'_>,
    selector: [u8; 8],
    payload: &[u8],
    sender: &[u8],
) -> Result<(), StateAccessError> {
        context.begin_transaction()?;
    let business = (|| -> Result<(), StateAccessError> {
        let state_view = context.state_view()?.encode().map_err(|_| StateAccessError::Backend)?;
        let mut output = core::ptr::null();
        let mut output_len = 0usize;
        unsafe { jamscript_scriptc_service_init(); }
        match selector { [161, 40, 174, 173, 222, 70, 110, 152] => unsafe { jamscript_scriptc_claim_entry_v1(payload.as_ptr(), payload.len(), sender.as_ptr(), sender.len(), state_view.as_ptr(), state_view.len(), &mut output, &mut output_len) },
[84, 252, 247, 131, 38, 202, 93, 107] => unsafe { jamscript_scriptc_bind_entry_v1(payload.as_ptr(), payload.len(), sender.as_ptr(), sender.len(), state_view.as_ptr(), state_view.len(), &mut output, &mut output_len) }, _ => return Err(StateAccessError::Rejected(jamscript_runtime_core::RuntimeError::UnknownAction.code())), }
        if output.is_null() && output_len != 0 { return Err(StateAccessError::ApplicationFailed(0x8000_0002)); }
        if output_len > service_runtime_core::MAX_SCRIPT_ACTION_RESULT_BYTES { return Err(StateAccessError::ApplicationFailed(0x8000_0002)); }
        let bytes = if output_len == 0 { &[] } else { unsafe { core::slice::from_raw_parts(output, output_len) } };
        let result = ScriptActionResultV1::decode(bytes)
            .map_err(|_| StateAccessError::ApplicationFailed(0x8000_0002))?;
        apply_script_result(context, result)
    })();
    match business {
        Ok(()) => context.commit_transaction(),
        Err(error) => { context.rollback_transaction()?; Err(error) }
    }
}

pub struct GeneratedApplication;
impl ServiceApplication for GeneratedApplication {
    type Error = StateAccessError;
    fn execute(
        &self,
        context: &mut service_runtime_core::ExecutionContext<'_>,
        raw_action: &[u8],
    ) -> Result<(), Self::Error> {
        
        let signed = jamscript_runtime_core::decode_signed_action_v1(raw_action)
            .map_err(|error| StateAccessError::Rejected(error.code()))?;
        match signed.action_selector { [161, 40, 174, 173, 222, 70, 110, 152] => (),
[84, 252, 247, 131, 38, 202, 93, 107] => (), _ => return Err(StateAccessError::Rejected(jamscript_runtime_core::RuntimeError::UnknownAction.code())), }
        let selected_selector = signed.action_selector;
        let verified = jamscript_runtime_core::verify_signed_action_v1(
            signed, NETWORK_DOMAIN, SERVICE_KEY, selected_selector,
        ).map_err(|error| StateAccessError::Rejected(error.code()))?;
        let sender = verified.sender;
        let nonce_key = jamscript_runtime_core::nonce_key(&sender);
        let nonce_bytes = context.state().get(&nonce_key)?.unwrap_or_default();
        let expected_nonce = match nonce_bytes.as_slice() {
            [] => 0u64,
            bytes if bytes.len() == 8 => u64::from_le_bytes(bytes.try_into().map_err(|_| StateAccessError::Backend)?),
            _ => return Err(StateAccessError::Backend),
        };
        if verified.nonce != expected_nonce {
            return Err(StateAccessError::Rejected(jamscript_runtime_core::RuntimeError::NonceMismatch.code()));
        }
        context.constrain_valid_until(verified.valid_until);
        let next_nonce = expected_nonce.checked_add(1).ok_or(StateAccessError::Backend)?;
        context.state().set(&nonce_key, &next_nonce.to_le_bytes())?;
        execute_scriptc(context, selected_selector, verified.payload, &sender)

    }
}
}
pub use generated_application_impl::GeneratedApplication;


#[no_mangle]
pub extern "C" fn minijam_refine() -> RefineOutput {
    service_runtime_guest::guest_support::reset_runtime();
    
    let mut input_size = 0usize;
    let status = unsafe { minijam_payload(INPUT.as_mut_ptr(), 1048576, &mut input_size) };
    if status != 0 { return error_output(1); }
    
    let input = unsafe { core::slice::from_raw_parts(INPUT.as_ptr(), input_size) };
    let runtime_input = match RuntimeRefineInputV1::decode(input) {
        Ok(value) => value,
        Err(_) => return error_output(1),
    };
    
    let output = match service_runtime_guest::refine_owned(&GeneratedApplication, runtime_input) {
        Ok(value) => value,
        Err(error) => return error_output(match error {
            service_runtime_guest::GuestError::InvalidInput => 1,
            service_runtime_guest::GuestError::State => 2,
            service_runtime_guest::GuestError::Application => 3,
        }),
    };
    if output.receipts.len() == 1 {
        if let Some(error_code) = output.receipts[0].error_code.filter(|code| code & 0x8000_0000 != 0) {
            service_runtime_guest::guest_support::diagnostic_stage(b"jamscript:native-error-output");
            return error_output(error_code);
        }
    }
    
    
    let encoded = match output.encode() {
        Ok(value) => value,
        Err(_) => return error_output(2),
    };
    if encoded.len() > 2097152 { return error_output(14); }
    unsafe { OUTPUT[..encoded.len()].copy_from_slice(&encoded); }
    
    RefineOutput { data: unsafe { OUTPUT.as_ptr() }, size: encoded.len() }
}

#[no_mangle]
pub extern "C" fn minijam_accumulate() {
    // Jambda places the accumulation init input in A memory and initializes
    // a0/a1 to its pointer and length, while the SDK export still uses
    // input_regs=0 because this is invocation-context transport.
    let init_pointer: usize;
    let init_size: usize;
    unsafe {
        core::arch::asm!(
            "mv {pointer}, a0",
            "mv {size}, a1",
            pointer = out(reg) init_pointer,
            size = out(reg) init_size,
            options(nomem, nostack, preserves_flags),
        );
    }
    let init_input = unsafe { core::slice::from_raw_parts(init_pointer as *const u8, init_size) };
    let (authoritative_tick, _sid, _items_count) =
        match decode_accumulate_init_input(init_input) { Ok(value) => value, Err(_) => return };
    let mut current = read_current_commitment().unwrap_or(service_runtime_core::EMPTY_STATE_ROOT_V1);
    let mut advanced = false;
    let count = unsafe { minijam_result_count() };
    for index in 0..count {
        let mut size = 0usize;
        if unsafe { minijam_result(index, RESULT.as_mut_ptr(), 2097152, &mut size) } != 0 { continue; }
        let refined = unsafe { core::slice::from_raw_parts(RESULT.as_ptr(), size) };
        let Ok(header) = RuntimeRefineOutputV1::decode_transition_header(refined) else { continue; };
        if header.parent_root != current { continue; }
        if header.transition_valid_until.is_some_and(|valid_until| authoritative_tick > valid_until) { continue; }
        current = header.new_root;
        advanced = true;
    }
    if advanced {
        let commitment = ManagedStateCommitmentV1::new(current).encode();
        let key = MANAGED_STATE_COMMITMENT_KEY_V1;
        let _ = unsafe {
            minijam_storage_write(key.as_ptr(), key.len(), commitment.as_ptr(), commitment.len())
        };
    }
}

fn read_current_commitment() -> Result<StateRoot, ()> {
    let key = MANAGED_STATE_COMMITMENT_KEY_V1;
    let mut bytes = [0u8; 34];
    let mut size = 0usize;
    let status = unsafe {
        minijam_storage_read(key.as_ptr(), key.len(), bytes.as_mut_ptr(), bytes.len(), &mut size)
    };
    match status {
        1 => Ok(service_runtime_core::EMPTY_STATE_ROOT_V1),
        0 if size == bytes.len() => ManagedStateCommitmentV1::decode(&bytes)
            .map(|commitment| commitment.root)
            .map_err(|_| ()),
        _ => Err(()),
    }
}

fn error_output(code: u32) -> RefineOutput { unsafe { OUTPUT[..4].copy_from_slice(&code.to_le_bytes()); RefineOutput { data: OUTPUT.as_ptr(), size: 4 } } }
fn read_fnencode(input: &[u8], offset: &mut usize) -> Result<u64, ()> {
    let first = *input.get(*offset).ok_or(())?;
    *offset += 1;
    if first < 0x80 { return Ok(first as u64); }
    let mut length = 0usize;
    while length < 8 && (first & (0x80u8 >> length)) != 0 { length += 1; }
    if length == 0 || length > 7 || input.len().saturating_sub(*offset) < length { return Err(()); }
    let mut low = 0u64;
    for index in 0..length { low |= (*input.get(*offset + index).ok_or(())? as u64) << (8 * index); }
    *offset += length;
    Ok(((first as u64 & (0x7fu64 >> length)) << (8 * length)) | low)
}

fn decode_accumulate_init_input(input: &[u8]) -> Result<(u64, u64, u64), ()> {
    let mut offset = 0usize;
    let tick = read_fnencode(input, &mut offset)?;
    let sid = read_fnencode(input, &mut offset)?;
    let items_count = read_fnencode(input, &mut offset)?;
    if offset != input.len() { return Err(()); }
    Ok((tick, sid, items_count))
}

