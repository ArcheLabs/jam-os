mod vm;

use polkavm::ProgramBlob;
use std::{env, fs, path::PathBuf};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = env::args_os().skip(1);
    let blob_path = args
        .next()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("../upstream/roms/doom.polkavm"));
    let wad_path = args
        .next()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("../upstream/roms/doom1.wad"));
    let blob = ProgramBlob::parse(fs::read(&blob_path)?.into())?;
    let mut doom = vm::DoomVm::from_blob(blob)?;
    doom.initialize(fs::read(&wad_path)?)
        .map_err(|error| format!("initialize failed: {error:?}"))?;
    let (width, height, frame) = doom
        .run_for_a_frame()
        .map_err(|error| format!("tick failed: {error:?}"))?;
    let frame_bytes = frame.len();
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
    println!("SUCCESSFUL_TICKS=1");
    println!("SUCCESSFUL_INPUT_CALLS=2");
    println!("INPUT_ACCEPTED=PASS");
    Ok(())
}
