#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK_FILE="$ROOT_DIR/toolchains/llvm.lock"

as_root() {
  if [[ "$(id -u)" == "0" ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

read_lock() {
  local key="$1"
  sed -nE "s/^${key} = \"([^\"]+)\"$/\1/p" "$LOCK_FILE"
}

test -f "$LOCK_FILE" || { echo "LLVM lock is missing: $LOCK_FILE" >&2; exit 1; }
repository="$(read_lock repository)"
suite="$(read_lock suite)"
package_version="$(read_lock package_version)"
clang_package="$(read_lock clang_package)"
llvm_package="$(read_lock llvm_package)"
lld_package="$(read_lock lld_package)"
clang_package_sha256="$(read_lock clang_package_sha256)"
llvm_package_sha256="$(read_lock llvm_package_sha256)"
lld_package_sha256="$(read_lock lld_package_sha256)"
libllvm20_package="$(read_lock libllvm20_package)"
libllvm20_package_sha256="$(read_lock libllvm20_package_sha256)"
libclang_cpp20_package="$(read_lock libclang_cpp20_package)"
libclang_cpp20_package_sha256="$(read_lock libclang_cpp20_package_sha256)"
libclang_common20_package="$(read_lock libclang_common20_package)"
libclang_common20_package_sha256="$(read_lock libclang_common20_package_sha256)"
llvm_runtime20_package="$(read_lock llvm_runtime20_package)"
llvm_runtime20_package_sha256="$(read_lock llvm_runtime20_package_sha256)"
llvm_linker_tools20_package="$(read_lock llvm_linker_tools20_package)"
llvm_linker_tools20_package_sha256="$(read_lock llvm_linker_tools20_package_sha256)"
llvm_dev20_package="$(read_lock llvm_dev20_package)"
llvm_dev20_package_sha256="$(read_lock llvm_dev20_package_sha256)"
libclang1_20_package="$(read_lock libclang1_20_package)"
libclang1_20_package_sha256="$(read_lock libclang1_20_package_sha256)"

check_exact_candidate() {
  local package="$1" candidate
  candidate="$(apt-cache policy "$package" | sed -n 's/^  Candidate: //p')"
  printf 'apt-cache policy %s: candidate=%s\n' "$package" "${candidate:-missing}"
  [[ "$candidate" == "$package_version" ]] || {
    echo "$package exact candidate ${package_version} is unavailable; refusing fallback" >&2
    exit 1
  }
}

if node "$ROOT_DIR/scripts/check-llvm-lock.mjs"; then
  check_exact_candidate "$libllvm20_package"
  echo "LLVM_TOOLCHAIN=PASS"
  exit 0
fi

if [[ "$(id -u)" != "0" ]] && ! command -v sudo >/dev/null; then
  echo "Exact LLVM is not installed and sudo is unavailable" >&2
  exit 1
fi

grep -Rqs "${suite}" /etc/apt/sources.list /etc/apt/sources.list.d 2>/dev/null || {
  command -v curl >/dev/null || { echo "curl is required to configure apt.llvm.org" >&2; exit 1; }
  command -v gpg >/dev/null || { echo "gpg is required to configure apt.llvm.org" >&2; exit 1; }
  curl -fsSL https://apt.llvm.org/llvm-snapshot.gpg.key | gpg --dearmor | as_root tee /usr/share/keyrings/llvm-snapshot.gpg >/dev/null
  echo "deb [signed-by=/usr/share/keyrings/llvm-snapshot.gpg] ${repository} ${suite} main" | as_root tee /etc/apt/sources.list.d/llvm-${suite}.list >/dev/null
}

as_root apt-get update
check_exact_candidate "$libllvm20_package"
as_root apt-get install -y --no-install-recommends \
  "${libllvm20_package}=${package_version}" \
  "${libclang_cpp20_package}=${package_version}" \
  "${libclang_common20_package}=${package_version}" \
  "${llvm_runtime20_package}=${package_version}" \
  "${llvm_linker_tools20_package}=${package_version}" \
  "${llvm_dev20_package}=${package_version}" \
  "${libclang1_20_package}=${package_version}" \
  "${clang_package}=${package_version}" \
  "${llvm_package}=${package_version}" \
  "${lld_package}=${package_version}"

for package in \
  "$libllvm20_package" "$libclang_cpp20_package" "$libclang_common20_package" \
  "$llvm_runtime20_package" "$llvm_linker_tools20_package" "$llvm_dev20_package" \
  "$libclang1_20_package" "$clang_package" "$llvm_package" "$lld_package"; do
  installed="$(dpkg-query -W -f='${Version}' "$package")"
  [[ "$installed" == "$package_version" ]] || {
    echo "$package is ${installed}; expected ${package_version}" >&2
    exit 1
  }
done

check_package_hash() {
  local package="$1" expected="$2" actual
  actual="$(apt-cache show "${package}=${package_version}" | awk '/^SHA256:/{print $2; exit}')"
  [[ "$actual" == "$expected" ]] || {
    echo "${package} package checksum ${actual:-missing} does not match llvm.lock ${expected}" >&2
    exit 1
  }
}

check_package_hash "$clang_package" "$clang_package_sha256"
check_package_hash "$llvm_package" "$llvm_package_sha256"
check_package_hash "$lld_package" "$lld_package_sha256"
check_package_hash "$libllvm20_package" "$libllvm20_package_sha256"
check_package_hash "$libclang_cpp20_package" "$libclang_cpp20_package_sha256"
check_package_hash "$libclang_common20_package" "$libclang_common20_package_sha256"
check_package_hash "$llvm_runtime20_package" "$llvm_runtime20_package_sha256"
check_package_hash "$llvm_linker_tools20_package" "$llvm_linker_tools20_package_sha256"
check_package_hash "$llvm_dev20_package" "$llvm_dev20_package_sha256"
check_package_hash "$libclang1_20_package" "$libclang1_20_package_sha256"

node "$ROOT_DIR/scripts/check-llvm-lock.mjs"
echo "LLVM_TOOLCHAIN=PASS"
