EMTRY(wsys_reset_handler)

_estack = ORIGIN(SRAM) + LENGTH(SRAM);

MEMORY
{
    /* */
    /* Entire Flash memory (sectors 0..11) with Single Bank Organization. */
    /* <DOC> 3: Embedded flash memory (FLASH)
    /* */
    FLASH       (rx)    : ORIGIN = 0x080000000, LENGTH = 2048K

    /* */
    /* <DOC> 2.3: Embedded SRAM
    /* */
    SRAM        (rxw)   : ORIGIN = 0x200200000, LENGTH = 384K

    /* Tightly coupled high-speed CPU access, no cache performance-critical code SRAM */
    /* <DOC> 2.3: Embedded SRAM
    /* */
    DTCM_SRAM   (rxw)   : ORIGIN = 0x20000000, LENGTH = 128K
}

SECTIONS
{
    .isr_vector :
    {
        . = ALIGN(4);
        KEEP(*(.isr_vector)) /* Startup code */
        . = ALIGN(4);
    } >FLASH

    .text:
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

    /* Initialized data sections into "RAM" Ram type memory */
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
    } >RAM AT> FLASH

    /* Uninitialized data section into "RAM" Ram type memory */
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
    } >RAM

    /* Used by the startup to initialize data */
    _sidata = LOADADDR(.data);
    _estack = ORIGIN(SRAM) + LENGTH(SRAM)

    /* Remove information from the compiler libraries */
    /DISCARD/ :
    {
        libc.a ( * )
        libm.a ( * )
        libgcc.a ( * )
    }
}
