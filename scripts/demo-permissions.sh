# Shared by the launcher and the sandbox boundary check.
demo_filesystem_permissions='{ ":root" = "read", ":workspace_roots" = { "." = "read", "src/implementation" = "write", "dist" = "write" } }'
verification_filesystem_permissions='{ ":root" = "read", ":workspace_roots" = { "." = "read", "dist" = "write" } }'
