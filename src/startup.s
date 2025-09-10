.cpu cortex-m7
.thumb

.global Reset_Handler
.global wsys_default_handler
.global __stack_top

.extern _etext
.extern _sdata
.extern _edata
.extern _sbss
.extern _ebss
.extern _sidata
.extern _estack

.section .text
Reset_Handler:
    ldr     r0, =_estack
    mov     sp, r0

    // Copy data to RAM
    // Initialize BSS to zero

    // Copy .data to SRAM
    ldr     r0, =_sidata             // Store .data LOCAL address inside r0
    ldr     r1, =_sdata              // Store .data RUNTIME start address inside r1
    ldr     r2, =_edata              // Store .data RUNTIME end address inside r2
_w_data_copy_loop:
    cmp     r1, r2
    ldrlt   r3, [r0], #4
    strlt   r3, [r1], #4
    blt     _w_data_copy_loop

_w_bss_init_loop:
    blt     _w_bss_init_loop

    bl      wsys_init
    bl      main
    b       wsys_default_handler

wsys_default_handler:
    b       wsys_default_handler
