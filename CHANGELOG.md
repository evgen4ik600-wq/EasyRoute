# Changelog

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
