#include <stdio.h>

int main(int argc, const char **argv) {
    printf("%s\n", (argc >= 1) ? argv[1] : argv[0]);
    return 0;
}
