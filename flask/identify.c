#if defined(__clang__)
#pragma message("__flask_compiler_clang")
#elif defined(__GNUC__)
#pragma message("__flask_compiler_gnu")
#elif defined(_MSC_VER)
#pragma message("__flask_compiler_msvc")
#else
#pragma messageg("__flask_compiler_unknown")
#endif
int main() {
    return 0;
}
