mod vm;

use polkavm::ProgramBlob;
use std::{env, fs, path::PathBuf};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = env::args_os().skip(1).collect::<Vec<_>>();
    let patched = args
        .first()
        .as_deref()
        .is_some_and(|arg| arg == std::ffi::OsStr::new("--patched"));
    if patched {
        args.remove(0);
    }
    let mut positional = args.into_iter();
    let blob_path = positional
        .next()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("../upstream/roms/doom.polkavm"));
    let wad_path = positional
        .next()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("../upstream/roms/doom1.wad"));
    let blob = ProgramBlob::parse(fs::read(&blob_path)?.into())?;
    let mut doom = vm::DoomVm::from_blob(blob)?;
    doom.initialize(fs::read(&wad_path)?)
        .map_err(|error| format!("initialize failed: {error:?}"))?;
    let (initial_status, initial_tics) = if patched {
        let status = doom
            .run_status()
            .map_err(|error| format!("initial status failed: {error:?}"))?;
        let before = doom
            .run_tics()
            .map_err(|error| format!("initial tics failed: {error:?}"))?;
        if status != 0 {
            return Err(format!("guest did not start in RUNNING state: {status}").into());
        }
        (status, before)
    } else {
        (0, 0)
    };
    let tick_count = if patched { 2 } else { 1 };
    let mut frame_info = (0, 0, 0);
    for _ in 0..tick_count {
        let (width, height, frame_bytes) = {
            let (width, height, frame) = doom
                .run_for_a_frame()
                .map_err(|error| format!("tick failed: {error:?}"))?;
            (width, height, frame.len())
        };
        frame_info = (width, height, frame_bytes);
    }
    let (width, height, frame_bytes) = frame_info;
    let later_tics = if patched {
        let after = doom
            .run_tics()
            .map_err(|error| format!("later tics failed: {error:?}"))?;
        if after < initial_tics {
            return Err(format!("DOOM tics regressed: {initial_tics} -> {after}").into());
        }
        Some(after)
    } else {
        None
    };
    if (width, height) != (640, 400) {
        return Err(format!("unexpected framebuffer dimensions: {width}x{height}").into());
    }
    // Match the upstream host's RIGHTARROW scancode (0xae).
    doom.on_keychange(0xae, true)
        .map_err(|error| format!("key press failed: {error:?}"))?;
    doom.on_keychange(0xae, false)
        .map_err(|error| format!("key release failed: {error:?}"))?;
    println!("REAL_POLKAVM_BOOT=PASS");
    println!("FRAME_WIDTH={width}");
    println!("FRAME_HEIGHT={height}");
    println!("FRAME_BYTES={frame_bytes}");
    if patched {
        println!("INITIAL_STATUS={initial_status}");
        println!("INITIAL_TICS={initial_tics}");
        println!("LATER_TICS={}", later_tics.expect("patched tics"));
        println!("EXT_RUN_STATUS=PASS");
        println!("EXT_RUN_TICS=PASS");
        println!("PATCHED_POLKADOOM_GUEST=PASS");
    }
    println!("SUCCESSFUL_TICKS={tick_count}");
    println!("SUCCESSFUL_INPUT_CALLS=2");
    println!("INPUT_ACCEPTED=PASS");
    Ok(())
}
