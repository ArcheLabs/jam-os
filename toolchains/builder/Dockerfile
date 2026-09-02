FROM ubuntu@sha256:c664f8f86ed5a386b0a340d981b8f81714e21a8b9c73f658c4bea56aa179d54a

ARG DEBIAN_FRONTEND=noninteractive
ARG LLVM_VERSION=1:20.1.8~++20250708083436+6fb913d3e2ec-1~exp1~20250708203453.133
ARG NODE_VERSION=24.15.0
ARG NODE_SHA256=472655581fb851559730c48763e0c9d3bc25975c59d518003fc0849d3e4ba0f6
ARG RUST_TOOLCHAIN=nightly-2026-05-02
ARG RUSTUP_VERSION=1.29.1

ENV TZ=UTC \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    DEBIAN_FRONTEND=noninteractive \
    JAM_CANONICAL_BUILDER=1 \
    JAM_CANONICAL_BUILDER_VERSION=1 \
    JAMSCRIPT_CLANG=/usr/lib/llvm-20/bin/clang \
    JAMSCRIPT_LLVM_AR=/usr/lib/llvm-20/bin/llvm-ar \
    JAMSCRIPT_LLVM_LD=/usr/lib/llvm-20/bin/ld.lld \
    SCRIPTC_NODE=/usr/local/node/bin/node \
    RUST_TOOLCHAIN=nightly-2026-05-02 \
    PATH=/usr/local/node/bin:/root/.cargo/bin:$PATH

RUN sed -i \
      -e 's|http://archive.ubuntu.com/ubuntu|http://mirrors.kernel.org/ubuntu|g' \
      -e 's|http://security.ubuntu.com/ubuntu|http://mirrors.kernel.org/ubuntu|g' \
      /etc/apt/sources.list \
    && apt-get -o Acquire::Retries=10 update \
    && apt-get -o Acquire::Retries=10 install -y --no-install-recommends ca-certificates curl gnupg git build-essential pkg-config python3 xz-utils \
    && curl -fsSL https://apt.llvm.org/llvm-snapshot.gpg.key -o /tmp/llvm-snapshot.gpg.key \
    && gpg --dearmor --output /usr/share/keyrings/llvm-snapshot.gpg /tmp/llvm-snapshot.gpg.key \
    && echo 'deb [signed-by=/usr/share/keyrings/llvm-snapshot.gpg] https://apt.llvm.org/focal/ llvm-toolchain-focal-20 main' > /etc/apt/sources.list.d/llvm.list \
    && apt-get -o Acquire::Retries=5 update \
    && apt-get -o Acquire::Retries=10 install -y --no-install-recommends \
      libllvm20=${LLVM_VERSION} \
      libclang-cpp20=${LLVM_VERSION} \
      libclang-common-20-dev=${LLVM_VERSION} \
      llvm-20-runtime=${LLVM_VERSION} \
      llvm-20-linker-tools=${LLVM_VERSION} \
      llvm-20-dev=${LLVM_VERSION} \
      libclang1-20=${LLVM_VERSION} \
      clang-20=${LLVM_VERSION} \
      llvm-20=${LLVM_VERSION} \
      lld-20=${LLVM_VERSION} \
    && curl -fsSL https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz -o /tmp/node.tar.xz \
    && echo "${NODE_SHA256}  /tmp/node.tar.xz" | sha256sum -c - \
    && mkdir -p /usr/local/node \
    && tar -xJf /tmp/node.tar.xz --strip-components=1 -C /usr/local/node \
    && curl -fsSL https://static.rust-lang.org/rustup/archive/${RUSTUP_VERSION}/x86_64-unknown-linux-gnu/rustup-init -o /tmp/rustup-init \
    && chmod 0755 /tmp/rustup-init \
    && /tmp/rustup-init -y --default-toolchain none --profile minimal \
    && rustup toolchain install ${RUST_TOOLCHAIN} --profile minimal --component rust-src \
    && rustup default ${RUST_TOOLCHAIN} \
    && chmod 0755 /root /root/.cargo /root/.cargo/bin /root/.rustup \
    && chmod -R a+rX /root/.cargo /root/.rustup \
    && node --version | grep -Fx "v${NODE_VERSION}" \
    && rustup toolchain list | grep -F "${RUST_TOOLCHAIN}-x86_64-unknown-linux-gnu" \
    && rustc +${RUST_TOOLCHAIN} --version | grep -F 'nightly' \
    && /usr/lib/llvm-20/bin/clang --version | grep -F 'Ubuntu clang version 20.1.8' \
    && rm -rf /var/lib/apt/lists/* /tmp/*

WORKDIR /workspace
