const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Xcode 16+ / 26+ 에서 fmt 라이브러리 consteval 컴파일 오류 패치
// base.h 에서 FMT_USE_CONSTEVAL=1 → 0 으로 직접 패치
const withXcode26Fix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      const patch = `
    # Xcode 16+ / 26+ fmt consteval 호환 패치
    fmt_base_h = File.join(installer.sandbox.root, 'fmt/include/fmt/base.h')
    if File.exist?(fmt_base_h)
      content = File.read(fmt_base_h)
      # FMT_USE_CONSTEVAL 1 을 0으로, consteval을 constexpr로 변경
      patched = content
        .gsub('#  define FMT_USE_CONSTEVAL 1', '#  define FMT_USE_CONSTEVAL 0')
        .gsub('#  define FMT_CONSTEVAL consteval', '#  define FMT_CONSTEVAL constexpr')
      if content != patched
        File.write(fmt_base_h, patched)
        puts '[withXcode26Fix] Patched fmt/base.h: consteval -> constexpr'
      else
        puts '[withXcode26Fix] fmt/base.h already patched'
      end
    else
      puts "[withXcode26Fix] fmt/base.h not found at #{fmt_base_h}"
    end`;

      if (!podfile.includes('withXcode26Fix')) {
        podfile = podfile.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n${patch}`
        );
        fs.writeFileSync(podfilePath, podfile);
        console.log('[withXcode26Fix] Podfile patched');
      }

      return config;
    },
  ]);
};

module.exports = withXcode26Fix;
