#include <common_def.h>

#include <errno.h>
#include <unistd.h>

#include <stdio.h>
#include <string.h>

#include <libopencm3/cm3/cortex.h>
#include <libopencm3/cm3/systick.h>
#include <libopencm3/stm32/gpio.h>
#include <libopencm3/stm32/rcc.h>
#include <libopencm3/stm32/usart.h>

#define SYSTICK_FREQ 1000
#define CPU_CLOCK_HZ 48 * 1e6

volatile u64 g_sys_tick = 0;

extern i32 _end;
#define WLOG_INFO        "[info]"
#define WLOG_DEBUG       "[debug]"
#define WLOG_ERROR       "[error]"
#define WLOG_OOPS        "[oops]"
#define WLOG_PANIC       "[panic]"
#define WLOG_SUBSYS_CORE "(core)"

struct wlog_entry {
    const char *fmt;
    const char *func;
    const char *file;
    u32         line;
    const char *level;
    const char *subsys;
};

#define w_log(wlevel, wfmt, ...)                                                                                       \
    do {                                                                                                               \
        struct wlog_entry __wlog_entry__ = (struct wlog_entry){                                                        \
            .fmt    = wfmt,                                                                                            \
            .func   = __func__,                                                                                        \
            .file   = __FILE__,                                                                                        \
            .line   = __LINE__,                                                                                        \
            .level  = wlevel,                                                                                          \
            .subsys = WLOG_SUBSYS_CORE,                                                                                \
        };                                                                                                             \
        printf("%s %s: ", __wlog_entry__.subsys, __wlog_entry__.level);                                                \
        printf(__wlog_entry__.fmt __VA_OPT__(, __VA_ARGS__));                                                          \
        putchar('\n');                                                                                                 \
    } while (0)

void w_sys_clock_setup(void) {
    rcc_periph_clock_enable(RCC_GPIOA);
    rcc_periph_clock_enable(RCC_USART1);
}

void w_sys_usart1_setup(void) {
    usart_disable(USART1);
    usart_set_baudrate(USART1, 115200);
    usart_set_databits(USART1, 8);
    usart_set_stopbits(USART1, USART_CR2_STOPBITS_1);
    usart_set_mode(USART1, USART_MODE_TX_RX);
    usart_set_parity(USART1, USART_PARITY_NONE);
    usart_set_flow_control(USART1, USART_FLOWCONTROL_NONE);
    usart_enable(USART1);
}

void w_sys_gpio_setup(void) {
    gpio_mode_setup(GPIOA, GPIO_MODE_AF, GPIO_PUPD_NONE, GPIO9 | GPIO10);
    gpio_set_af(GPIOA, GPIO_AF7, GPIO9);
    gpio_set_af(GPIOA, GPIO_AF7, GPIO10);
}

void w_sys_init(void) {
    // Initialise peripherials...

    // Initialize HSI
    rcc_clock_setup_hsi(&rcc_3v3[RCC_CLOCK_3V3_48MHZ]);

    // Initialize systick
    systick_set_frequency(SYSTICK_FREQ, rcc_ahb_frequency);
    systick_counter_enable();
    systick_interrupt_enable();

    w_sys_clock_setup();
    w_sys_gpio_setup();
    w_sys_usart1_setup();
}

i32 wlogger(struct wlog_entry entry) {
    return 1;
}

void main(void) {
    puts(NULL);
    w_log(WLOG_INFO,
          "Warden version v%s (%s armv7) %s, %d %s %d "
          "UTC %d:%d:%d",
          WBUILD_VERSION, WBUILD_COMPILER, WBUILD_DATE_WEEKDAY, WBUILD_DATE_DAY, WBUILD_DATE_MONTH, WBUILD_DATE_YEAR,
          WBUILD_DATE_HOUR, WBUILD_DATE_MIN, WBUILD_DATE_SEC);
    w_log(WLOG_INFO, "Command line: %s", "init=/sbin/sh console=usart1");
    w_log(WLOG_INFO, "USART1 initialized as /dev/tty0");
    w_log(WLOG_INFO, "RCC initialized as: HSI @ %luMhz", CPU_CLOCK_HZ / 1e6);
    w_log(WLOG_INFO, "SysTick initialized @ %uKhz", SYSTICK_FREQ / 1000);

    while (1) {
        asm volatile("nop");
    }
}

void w_sys_systick_handler(void) {
    ++g_sys_tick;
}
