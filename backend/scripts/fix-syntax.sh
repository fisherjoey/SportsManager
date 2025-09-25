#!/bin/bash

echo "Fixing common TypeScript syntax errors..."

# Fix module.export -> module.exports
find src -name "*.ts" -type f -exec sed -i 's/module\.export /module.exports./g' {} \;

# Fix incorrect import extensions
find src -name "*.ts" -type f -exec sed -i "s/from '\(.*\)\.ts'/from '\1'/g" {} \;
find src -name "*.ts" -type f -exec sed -i 's/from "\(.*\)\.ts"/from "\1"/g' {} \;

# Fix exports. patterns that should be export const
find src -name "*.ts" -type f -exec sed -i 's/^exports\.\([a-zA-Z_][a-zA-Z0-9_]*\) =/export const \1 =/g' {} \;

echo "Syntax fixes applied!"