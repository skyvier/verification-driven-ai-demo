{
  description = "Development environment for the verification-driven AI demo";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { nixpkgs, ... }:
    let
      systems = [ "aarch64-darwin" "aarch64-linux" "x86_64-linux" ];
      forEachSystem = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forEachSystem (system:
        let
          packages = nixpkgs.legacyPackages.${system};
        in
        {
          default = packages.mkShellNoCC {
            packages = with packages; [
              gh
              git
              nodejs_24
            ];
          };
        });
    };
}
