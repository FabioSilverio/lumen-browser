add_library(lumen_core STATIC
  src/lumen_core.cpp
)

target_include_directories(lumen_core PUBLIC include)

find_package(mimalloc REQUIRED)
target_link_libraries(lumen_core PUBLIC mimalloc::mimalloc)