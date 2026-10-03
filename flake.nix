{
  description = "Visualization for Freifunk open mesh network nodes";

  inputs.nixpkgs.url = "https://channels.nixos.org/nixos-unstable/nixexprs.tar.xz";

  outputs =
    { nixpkgs, ... }:

    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      forEachSupportedSystem =
        f: nixpkgs.lib.genAttrs supportedSystems (system: f (import nixpkgs { inherit system; }));
    in
    {
      devShells = forEachSupportedSystem (pkgs: {
        default = pkgs.mkShellNoCC { packages = with pkgs; [ nodejs_26 ]; };
      });

      packages = forEachSupportedSystem (
        pkgs:
        let
          package = builtins.fromJSON (builtins.readFile ./package.json);
          version = package.version;
          src = ./.;
        in
        {
          default = pkgs.callPackage ./nix/package.nix { inherit version src; };
        }
      );
    };
}
