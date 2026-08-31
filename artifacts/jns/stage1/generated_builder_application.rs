pub const JAMSCRIPT_RUNTIME_REFINE_INPUT_VERSION: u8 = 1;
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
