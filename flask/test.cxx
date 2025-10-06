#include <iostream>

int main(int argc, const char **argv) {
    std::cout << ((argc >= 1) ? argv[1] : argv[0]) << std::endl;
    return 0;
}
