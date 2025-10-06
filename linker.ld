/* Linker file for STM32F74xxx MCU, Renode EMU */

ENTRY(w_sys_reset_handler)

_estack = ORIGIN(SRAM) + LENGTH(SRAM);
_Min_Heap_Size = 0x200;      /* required amount of heap  */
_Min_Stack_Size = 0x400; /* required amount of stack */

MEMORY
{
    /* */
    /* Entire Flash memory (sectors 0..11) with Single Bank Organization. */
    /* <DOC> 3: Embedded flash memory (FLASH)
    /* */
    FLASH       (rx)    : ORIGIN = 0x08000000, LENGTH = 1024K

    /* */
    /* <DOC> 2.3: Embedded SRAM
    /* */
    SRAM        (rwx)   : ORIGIN = 0x20000000, LENGTH = 320K

    CCMRAM      (rwx)   : ORIGIN = 0x10000000, LENGTH = 64K
}

SECTIONS
{
    .isr_vector :
    {
        . = ALIGN(4);
        KEEP(*(.isr_vector)) /* Startup code */
        . = ALIGN(4);
    } >FLASH

    .text :
    {
        . = ALIGN(4);
        *(.text)
        *(.text*)

        KEEP (*(.init))
        KEEP (*(.fini))

        . = ALIGN(4);
        _etext = .;        /* define a global symbols at end of code */
    } > FLASH

    /* Constant data into "FLASH" Rom type memory */
    .rodata :
    {
        . = ALIGN(4);
        *(.rodata)         /* .rodata sections (constants, strings, etc.) */
        *(.rodata*)        /* .rodata* sections (constants, strings, etc.) */
        . = ALIGN(4);
    } >FLASH

    /* Initialized data sections into "SRAM" Ram type memory */
    .data :
    {
        . = ALIGN(4);
        _sdata = .;        /* create a global symbol at data start */
        *(.data)           /* .data sections */
        *(.data*)          /* .data* sections */
        *(.ramfunc)        /* .RamFunc sections */
        *(.ramfunc*)       /* .RamFunc* sections */

        . = ALIGN(4);
        _edata = .;        /* define a global symbol at data end */
    } >SRAM AT> FLASH

    /* Uninitialized data section into "SRAM" Ram type memory */
    . = ALIGN(4);
    .bss :
    {
        /* This is used by the startup in order to initialize the .bss section */
        _sbss = .;         /* define a global symbol at bss start */
        __bss_start__ = _sbss;
        *(.bss)
        *(.bss*)
        *(COMMON)

        . = ALIGN(4);
        _ebss = .;         /* define a global symbol at bss end */
        __bss_end__ = _ebss;
    } >SRAM

    ._user_heap_stack :
    {
        . = ALIGN(8);
        PROVIDE(end = .);
        PROVIDE(_end = .);
        . = . + _Min_Heap_Size;
        . = . + _Min_Stack_Size;
        . = ALIGN(8);
    } >SRAM

    /* Used by the startup to initialize data */
    _sidata = LOADADDR(.data);
    _estack = ORIGIN(SRAM) + LENGTH(SRAM);

    /* Remove information from the compiler libraries */
    /DISCARD/ :
    {
        /* libc.a ( * ) */
        /* libm.a ( * ) */
        libgcc.a ( * )
    }
}
