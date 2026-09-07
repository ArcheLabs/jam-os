pub const JAMSCRIPT_RUNTIME_REFINE_INPUT_VERSION: u8 = 1;
mod generated_application_impl {
use service_runtime_core::{ScriptActionResultV1, ServiceApplication, ServiceKeyV1, StateAccessError};

const SERVICE_KEY: ServiceKeyV1 = ServiceKeyV1::new([181, 222, 113, 203, 216, 123, 72, 171, 246, 42, 66, 137, 23, 42, 92, 21, 6, 196, 99, 136, 105, 160, 15, 149, 228, 249, 178, 46, 242, 121, 171, 168]);
const NETWORK_DOMAIN: [u8; 32] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

unsafe extern "C" {
    fn jamscript_scriptc_service_init();
    fn jamscript_scriptc_initialize_entry_v1(payload: *const u8, payload_len: usize, sender: *const u8, sender_len: usize, state: *const u8, state_len: usize, output: *mut *const u8, output_len: *mut usize);
    fn jamscript_scriptc_setProfile_entry_v1(payload: *const u8, payload_len: usize, sender: *const u8, sender_len: usize, state: *const u8, state_len: usize, output: *mut *const u8, output_len: *mut usize);
    fn jamscript_scriptc_setAppearance_entry_v1(payload: *const u8, payload_len: usize, sender: *const u8, sender_len: usize, state: *const u8, state_len: usize, output: *mut *const u8, output_len: *mut usize);
    fn jamscript_scriptc_upsertDesktopIcon_entry_v1(payload: *const u8, payload_len: usize, sender: *const u8, sender_len: usize, state: *const u8, state_len: usize, output: *mut *const u8, output_len: *mut usize);
    fn jamscript_scriptc_removeDesktopIcon_entry_v1(payload: *const u8, payload_len: usize, sender: *const u8, sender_len: usize, state: *const u8, state_len: usize, output: *mut *const u8, output_len: *mut usize);
    fn jamscript_scriptc_setNodeMetadata_entry_v1(payload: *const u8, payload_len: usize, sender: *const u8, sender_len: usize, state: *const u8, state_len: usize, output: *mut *const u8, output_len: *mut usize);
    fn jamscript_scriptc_removeNodeMetadata_entry_v1(payload: *const u8, payload_len: usize, sender: *const u8, sender_len: usize, state: *const u8, state_len: usize, output: *mut *const u8, output_len: *mut usize);
    fn jamscript_scriptc_publishSite_entry_v1(payload: *const u8, payload_len: usize, sender: *const u8, sender_len: usize, state: *const u8, state_len: usize, output: *mut *const u8, output_len: *mut usize);
    fn jamscript_scriptc_setDesktopIndex_entry_v1(payload: *const u8, payload_len: usize, sender: *const u8, sender_len: usize, state: *const u8, state_len: usize, output: *mut *const u8, output_len: *mut usize);
    fn jamscript_scriptc_setDirectoryIndex_entry_v1(payload: *const u8, payload_len: usize, sender: *const u8, sender_len: usize, state: *const u8, state_len: usize, output: *mut *const u8, output_len: *mut usize);
    fn jamscript_scriptc_writeFile_entry_v1(payload: *const u8, payload_len: usize, sender: *const u8, sender_len: usize, state: *const u8, state_len: usize, output: *mut *const u8, output_len: *mut usize);
    fn jamscript_scriptc_mkdir_entry_v1(payload: *const u8, payload_len: usize, sender: *const u8, sender_len: usize, state: *const u8, state_len: usize, output: *mut *const u8, output_len: *mut usize);
    fn jamscript_scriptc_removeNode_entry_v1(payload: *const u8, payload_len: usize, sender: *const u8, sender_len: usize, state: *const u8, state_len: usize, output: *mut *const u8, output_len: *mut usize);
    fn jamscript_scriptc_renameFile_entry_v1(payload: *const u8, payload_len: usize, sender: *const u8, sender_len: usize, state: *const u8, state_len: usize, output: *mut *const u8, output_len: *mut usize);
}

fn application_key_allowed(key: &[u8]) -> bool {
    if key.len() < 3 || key[0] != service_runtime_core::APPLICATION_KEY_CLASS_V1 { return false; }
    let namespace_len = u16::from_le_bytes([key[1], key[2]]) as usize;
    let Some(namespace) = key.get(3..3usize.saturating_add(namespace_len)) else { return false; };
    namespace == &[99, 111, 109, 112, 117, 116, 101, 114, 46, 112, 114, 111, 102, 105, 108, 101, 47, 118, 49] || namespace == &[99, 111, 109, 112, 117, 116, 101, 114, 46, 97, 112, 112, 101, 97, 114, 97, 110, 99, 101, 47, 118, 49] || namespace == &[99, 111, 109, 112, 117, 116, 101, 114, 46, 100, 101, 115, 107, 116, 111, 112, 45, 105, 99, 111, 110, 115, 47, 118, 49] || namespace == &[99, 111, 109, 112, 117, 116, 101, 114, 46, 110, 111, 100, 101, 115, 47, 118, 49] || namespace == &[99, 111, 109, 112, 117, 116, 101, 114, 46, 115, 105, 116, 101, 45, 109, 97, 110, 105, 102, 101, 115, 116, 47, 118, 49] || namespace == &[99, 111, 109, 112, 117, 116, 101, 114, 46, 100, 101, 115, 107, 116, 111, 112, 45, 105, 110, 100, 101, 120, 47, 118, 49] || namespace == &[99, 111, 109, 112, 117, 116, 101, 114, 46, 100, 105, 114, 101, 99, 116, 111, 114, 121, 45, 105, 110, 100, 101, 120, 47, 118, 49]
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
        match selector { [214, 94, 72, 148, 227, 60, 178, 205] => unsafe { jamscript_scriptc_initialize_entry_v1(payload.as_ptr(), payload.len(), sender.as_ptr(), sender.len(), state_view.as_ptr(), state_view.len(), &mut output, &mut output_len) },
[109, 180, 62, 44, 61, 183, 16, 61] => unsafe { jamscript_scriptc_setProfile_entry_v1(payload.as_ptr(), payload.len(), sender.as_ptr(), sender.len(), state_view.as_ptr(), state_view.len(), &mut output, &mut output_len) },
[54, 173, 19, 191, 171, 118, 191, 55] => unsafe { jamscript_scriptc_setAppearance_entry_v1(payload.as_ptr(), payload.len(), sender.as_ptr(), sender.len(), state_view.as_ptr(), state_view.len(), &mut output, &mut output_len) },
[166, 120, 235, 153, 135, 137, 117, 158] => unsafe { jamscript_scriptc_upsertDesktopIcon_entry_v1(payload.as_ptr(), payload.len(), sender.as_ptr(), sender.len(), state_view.as_ptr(), state_view.len(), &mut output, &mut output_len) },
[51, 249, 44, 133, 246, 102, 160, 217] => unsafe { jamscript_scriptc_removeDesktopIcon_entry_v1(payload.as_ptr(), payload.len(), sender.as_ptr(), sender.len(), state_view.as_ptr(), state_view.len(), &mut output, &mut output_len) },
[163, 152, 175, 103, 83, 7, 195, 34] => unsafe { jamscript_scriptc_setNodeMetadata_entry_v1(payload.as_ptr(), payload.len(), sender.as_ptr(), sender.len(), state_view.as_ptr(), state_view.len(), &mut output, &mut output_len) },
[142, 31, 167, 224, 147, 11, 102, 232] => unsafe { jamscript_scriptc_removeNodeMetadata_entry_v1(payload.as_ptr(), payload.len(), sender.as_ptr(), sender.len(), state_view.as_ptr(), state_view.len(), &mut output, &mut output_len) },
[98, 57, 125, 84, 207, 49, 198, 47] => unsafe { jamscript_scriptc_publishSite_entry_v1(payload.as_ptr(), payload.len(), sender.as_ptr(), sender.len(), state_view.as_ptr(), state_view.len(), &mut output, &mut output_len) },
[189, 219, 167, 16, 217, 85, 71, 4] => unsafe { jamscript_scriptc_setDesktopIndex_entry_v1(payload.as_ptr(), payload.len(), sender.as_ptr(), sender.len(), state_view.as_ptr(), state_view.len(), &mut output, &mut output_len) },
[196, 104, 114, 110, 20, 132, 16, 186] => unsafe { jamscript_scriptc_setDirectoryIndex_entry_v1(payload.as_ptr(), payload.len(), sender.as_ptr(), sender.len(), state_view.as_ptr(), state_view.len(), &mut output, &mut output_len) },
[126, 148, 76, 145, 212, 124, 222, 56] => unsafe { jamscript_scriptc_writeFile_entry_v1(payload.as_ptr(), payload.len(), sender.as_ptr(), sender.len(), state_view.as_ptr(), state_view.len(), &mut output, &mut output_len) },
[216, 184, 238, 245, 121, 246, 249, 54] => unsafe { jamscript_scriptc_mkdir_entry_v1(payload.as_ptr(), payload.len(), sender.as_ptr(), sender.len(), state_view.as_ptr(), state_view.len(), &mut output, &mut output_len) },
[8, 138, 229, 114, 47, 118, 70, 232] => unsafe { jamscript_scriptc_removeNode_entry_v1(payload.as_ptr(), payload.len(), sender.as_ptr(), sender.len(), state_view.as_ptr(), state_view.len(), &mut output, &mut output_len) },
[132, 222, 171, 134, 137, 141, 232, 95] => unsafe { jamscript_scriptc_renameFile_entry_v1(payload.as_ptr(), payload.len(), sender.as_ptr(), sender.len(), state_view.as_ptr(), state_view.len(), &mut output, &mut output_len) }, _ => return Err(StateAccessError::Rejected(jamscript_runtime_core::RuntimeError::UnknownAction.code())), }
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
        match signed.action_selector { [214, 94, 72, 148, 227, 60, 178, 205] => (),
[109, 180, 62, 44, 61, 183, 16, 61] => (),
[54, 173, 19, 191, 171, 118, 191, 55] => (),
[166, 120, 235, 153, 135, 137, 117, 158] => (),
[51, 249, 44, 133, 246, 102, 160, 217] => (),
[163, 152, 175, 103, 83, 7, 195, 34] => (),
[142, 31, 167, 224, 147, 11, 102, 232] => (),
[98, 57, 125, 84, 207, 49, 198, 47] => (),
[189, 219, 167, 16, 217, 85, 71, 4] => (),
[196, 104, 114, 110, 20, 132, 16, 186] => (),
[126, 148, 76, 145, 212, 124, 222, 56] => (),
[216, 184, 238, 245, 121, 246, 249, 54] => (),
[8, 138, 229, 114, 47, 118, 70, 232] => (),
[132, 222, 171, 134, 137, 141, 232, 95] => (), _ => return Err(StateAccessError::Rejected(jamscript_runtime_core::RuntimeError::UnknownAction.code())), }
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
