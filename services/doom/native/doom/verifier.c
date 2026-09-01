#include <stdint.h>

#include "m_fixed.h"

uint32_t jamscript_native_doom_probeDoomNative_v1(
    const uint8_t *input, uint32_t input_len, uint64_t *output) {
  (void)input;
  (void)input_len;
  if (output == 0) return 1u;
  *output = (uint32_t)FixedMul(2 * FRACUNIT, 3 * FRACUNIT) / FRACUNIT;
  return 0u;
}
