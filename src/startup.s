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

    // Copy Bss to zero

    bl      wsys_init
    bl      main
    b       .

wsys_default_handler:
    b       wsys_default_handler
