#include <common_def.h>
#include <sys/stat.h>
#include <errno.h>
#include <unistd.h>
#include <libopencm3/stm32/usart.h>

extern i32 _end;

void *_sbrk(i32 incr) {
    static u8 *heap = NULL;
    u8        *prev_heap;

    if (!heap) {
        heap = (u8 *)&_end;
    }
    prev_heap = heap;
    heap += incr;
    return prev_heap;
}

i32 _fstat(i32 file, struct stat*st) {
    st->st_mode = S_IFCHR;
    return 0;
}

off_t _lseek(i32 file, off_t offset, i32 whence) {
    return 0;
}

i32 _close(i32 fd) {
    return -1;
}

i32 _read(i32 fd, char* buf, i32 count) {
    i32 read = 0;
    for (; count > 0; --count) {
        buf[read++] = (char)usart_recv_blocking(USART1);
    }
    return read;
}

i32 _write(i32 file, char *ptr, i32 len) {
    i32 i;
    if (file == STDOUT_FILENO || file == STDERR_FILENO) {
        for (i = 0; i < len; ++i) {
            if (ptr[i] == '\n') {
                usart_send_blocking(USART1, '\r');
            }
            usart_send_blocking(USART1, (u16)ptr[i]);
        }
        return i;
    }
    errno = EIO;
    return -1;
}

i32 _isatty(i32 fd) {
    return 1;
}
