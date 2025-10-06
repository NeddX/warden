.cpu cortex-m7
.thumb
.syntax unified

.global w_sys_reset_handler
.global w_sys_default_handler

// Linker exported symbols, used to initialize the C runtime
.extern _etext
.extern _sdata
.extern _edata
.extern _sbss
.extern _ebss
.extern _sidata
.extern _estack

// Functions exported by kernel.c
.extern w_sys_init
.extern w_sys_systick_handler
.extern __libc_init_array
.extern main

.section .text
w_sys_reset_handler:
    ldr     r0, =_estack
    mov     sp, r0

    // Copy data to RAM
    // Initialize BSS to zero

    // Copy .data to SRAM
    ldr     r0, =_sidata                    // Store .data LOCAL address
    ldr     r1, =_sdata                     // Store .data RUNTIME start address
    ldr     r2, =_edata                     // Store .data RUNTIME end address
_w_data_copy_loop:
    cmp     r1, r2
    ittt    ne
    ldrne   r3, [r0], #4
    strne   r3, [r1], #4
    bne     _w_data_copy_loop

    ldr     r0, =_sbss                      // Store .bss RUNTIME start address
    ldr     r1, =_ebss                      // Store .bss RUNTIME end address
    mov     r2, #0                          // Initialize .bss to zero

    // Initialize .bss to zeros
_w_bss_init_loop:
    cmp     r0, r1
    itt     ne
    strne   r2, [r0], #4
    bne     _w_bss_init_loop

    // Begin C runtime
    bl      __libc_init_array
    bl      w_sys_init
    bl      main

    // Theoretically we should never get here, but if we do,
    // then we shall loop indefinitely.
    b       w_sys_spin

w_sys_spin:
    nop
    b       w_sys_spin

w_sys_default_handler:
    nop
    pop     {pc}

.section .isr_vector, "a", %progbits        // Vector table
.align 2                                    // We need this to be aligned (2 = 4bytes)
.word _estack                               // SP
.word w_sys_reset_handler                   // Reset

.word w_sys_default_handler                 // NMI
.word w_sys_default_handler                 // Hard Fault
.word w_sys_default_handler                 // Memory Management Fault
.word w_sys_default_handler                 // Bus Fault
.word w_sys_default_handler                 // Usage Fault

.word 0                                     // Reserved 0x001C - 0x002C
.word 0
.word 0
.word 0

.word w_sys_default_handler                 // SVCall
.word w_sys_default_handler                 // Debug Mon
.word 0                                     // Rsvd
.word w_sys_default_handler                 // PendSV
.word w_sys_systick_handler                 // Systick
// External interrupts...
