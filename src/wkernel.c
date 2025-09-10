#include <stdint.h>

#include "common_def.h"

void wsys_init(void) {
    // Initialise peripherials...
}

void main(void) {
    volatile u32 *uart1_dr = (u32*)0x40011004;
    const char *msg = "hello from cortex-m7!\n";
    while (*msg) {
        *uart1_dr = *msg++;
    }

    while (1);
}
