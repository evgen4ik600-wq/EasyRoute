# Changelog

## EasyRoute 1.2.20

Runtime-аудит на реальном OpenWrt/Xiaomi после 1.2.18.

Исправлено и усилено:

- исправлен падёж динамического каталога OpenCCK при загрузке `jshn.sh` из-за `set -u`;
- self-test теперь реально запускает catalog helper, поэтому «Всё работает» не показывается при сломанном каталоге;
- обнаруживается уже настроенный внешний локальный защищённый DNS (`https-dns-proxy`, `dnscrypt-proxy`, localhost resolver), и EasyRoute не перезаписывает его Stubby;
- LuCI показывает, что защищённый DNS уже существует, и не предлагает поверх него включать EasyRoute DoT;
- для новых catalog bundles IPv4 CIDR стали **опциональными и выключены по умолчанию**: OpenCCK может возвращать очень широкие подсети, которые захватывают посторонний трафик;
- добавлен read-only `/usr/libexec/easyroute-audit` с редактированием секретов AWG;
- audit проверяет OpenCCK Main/Beta, multi-site domains/CIDR, RPC, AWG, policy routing, nftables, DNS, cron и locks;
- CI проверяет catalog helper, CIDR opt-in, external encrypted DNS, audit redaction и LuCI wiring.

Проверенный payload: `e4ebe581e78d6a1a40c8912cb5c38d3391f0f12a`.

## EasyRoute 1.2.16

Аудит стабильности и безопасности после 1.2.0.

Исправлено:

1. LuCI больше не остаётся на старом интерфейсе из browser cache: используется новый versioned asset `routes-v1216.js`.
2. Исправлен литеральный ` в temp-файле URL updater.
3. Исправлен литеральный ` в temp-файле ручного правила.
4. Исправлены temp-файлы cron установщика.
5. Исправлены и выровнены temp-файлы uninstall.
6. Installer и AWG bootstrap используют уникальные PID-based temp paths.
7. URL updater защищён от параллельного запуска.
8. Применение firewall/policy routing защищено от параллельного запуска.
9. URL/Catalog update считается успешным только после успешного `easyroute apply`.
10. Перед очисткой проверяется, что routing table не принадлежит другому ПО.
11. При изменении/удалении VPN-профиля сначала корректно удаляются его старые policy routes.
12. IPv6-строки из удалённых списков жёстко фильтруются перед генерацией nftables.
13. Пользовательский fwmark нормализуется и ограничен диапазоном 1..255.
14. Каталоги/backup EasyRoute получают root-only permissions.
15. Файл версии записывается только после успешного применения новой версии.
16. Обновление payload стало транзакционным: при ошибке применения возвращаются прежние файлы и конфигурация.

Проверенный payload: `dab7784fbd723a3c7a708b9c8890ab4271194906`.

## EasyRoute 1.2.0

Добавлен **динамический каталог OpenCCK Main + Beta** без постоянного хранения полного каталога на роутере.

- при открытии окна «Добавить приложение» EasyRoute временно получает каталоги:
  - `https://iplist.opencck.org/?format=json&data=group`;
  - `https://beta.iplist.opencck.org/?format=json&data=group`;
- каталог используется только в оперативной памяти/`/tmp` и удаляется после запроса;
- во flash не сохраняется полный каталог OpenCCK;
- поиск работает по порталу и категории;
- можно фильтровать основной каталог, Beta или оба сразу;
- можно выбрать несколько сервисов галочками или всю показанную категорию;
- только после нажатия «Скачать выбранное и включить» роутер загружает домены и CIDR4 выбранных сервисов;
- несколько выбранных сервисов объединяются в **одно логическое правило EasyRoute**, а не создают десятки отдельных правил;
- домены и CIDR4 хранятся в одном локальном списке правила;
- повторяющиеся записи удаляются;
- длинные выборки разбиваются на пакеты по 30 `site=`, чтобы не упираться в длину URL;
- итоговый список ограничен 1 МиБ и дополнительно проверяется по свободному месту;
- каталожные правила автоматически обновляются каждые 24 часа через тот же rollback-механизм;
- если сервис есть и в Main, и в Beta, EasyRoute использует Main как основной источник;
- редактирование каталожного правила не передаёт весь большой список через RPC — только выбранные имена сервисов.

Проверенный payload: `70d2d0c3f24e31a71dc643022390163b966304f1`.

## EasyRoute 1.1.25

Добавлен **опциональный DNS-over-TLS** без вмешательства в WAN/PPPoE/IPv6:

- dnsmasq остаётся главным DNS для клиентов, поэтому EasyRoute nftset продолжает видеть доменные ответы;
- Stubby слушает только localhost:5453 и используется как upstream для dnsmasq;
- доступны AdGuard, Cloudflare и Google DoT;
- DNS провайдера игнорируется на уровне dnsmasq через `noresolv=1`, без изменения `peerdns` у WAN;
- существующие split-DNS правила dnsmasq сохраняются;
- если Stubby уже настроен вне EasyRoute, EasyRoute отказывается перезаписывать его конфигурацию;
- перед изменениями сохраняются прежние DNS-параметры;
- при ошибке запуска Stubby, dnsmasq или DNS-проверки выполняется rollback;
- при удалении EasyRoute прежний DNS сначала восстанавливается;
- IPv6 не отключается и WAN/WAN6 не переписываются;
- Stubby устанавливается только при ручном включении DoT, а не при обычной установке EasyRoute.

Проверенный payload: `557e7745c6ff7d7e882a512f8c397dcf1b3ebdf9`.

## EasyRoute 1.1.24

Patch **1.1.24** is named after the **24 defects fixed** during the stability audit.

1. Fixed standalone repository download paths after moving EasyRoute out of `openwrt-simple-ui`.
2. Fixed invalid rule IDs that caused repeated «Некорректный ID» errors.
3. Added collision-safe IDs for rules, devices, and VPN profiles.
4. Made missing OpenCCK CIDR data non-fatal when a valid domain list exists.
5. Split URL updater timestamps into last attempt and last successful update.
6. Failed URL downloads no longer postpone the next retry for a full 24-hour interval.
7. A single URL-list update now restores the previous list if `apply` fails.
8. Batch URL updates now restore all changed lists if final `apply` fails.
9. URL-rule creation/editing is transactional and restores the previous UCI configuration on failure.
10. Manual-rule creation/editing is transactional and restores the previous list/configuration on failure.
11. Rule deletion is transactional and is cancelled if routing cannot be reapplied safely.
12. Global EasyRoute settings changes are transactional.
13. Device save/edit operations are transactional.
14. Device deletion is transactional.
15. VPN profile save/edit operations are transactional.
16. VPN profile deletion is blocked while the profile is still used and rolls back on apply failure.
17. Policy rules are removed by exact EasyRoute mark/table instead of deleting everything at a priority.
18. Custom VPN profiles no longer cause EasyRoute to touch the default policy slot unnecessarily.
19. EasyRoute detects occupied policy-routing priorities instead of silently colliding with other software.
20. Policy-routing apply failures now fail the whole transaction and trigger rollback.
21. `fallback=block` now also blocks device-wide MAC routing when its VPN is unavailable.
22. Health checks now test HTTPS Internet access, fresh AWG handshake, EasyRoute's own policy rules, OpenCCK access, firewall/DNS and rule conflicts.
23. The LuCI status no longer says «Всё работает» merely because the AWG interface exists.
24. Standalone GitHub CI was rebuilt for the real repository layout, and the installer now pins the tested payload commit instead of mixing files from a moving `main`.

### Verified

The release payload is pinned to commit:

`0af3bae0afa55fc6b1e621bd28e93e2bd1ada49e`

GitHub Actions validates shell syntax, JSON syntax, LuCI JavaScript syntax, installer references, and EasyRoute safety invariants.
