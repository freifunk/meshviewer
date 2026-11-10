{
  description = "Visualization for Freifunk open mesh network nodes";

  inputs = {
    nixpkgs.url = "https://channels.nixos.org/nixos-unstable/nixexprs.tar.zst";
    treefmt-nix = {
      url = "github:numtide/treefmt-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      nixpkgs,
      treefmt-nix,
      self,
      ...
    }:

    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      forEachSupportedSystem =
        f: nixpkgs.lib.genAttrs supportedSystems (system: f (import nixpkgs { inherit system; }));
      treefmtEval = forEachSupportedSystem (pkgs: treefmt-nix.lib.evalModule pkgs ./treefmt.nix);
    in
    {
      devShells = forEachSupportedSystem (pkgs: {
        default = pkgs.mkShellNoCC {
          packages = with pkgs; [
            nodejs_26
            typescript
            prettier
          ];
        };
      });

      packages = forEachSupportedSystem (
        pkgs:
        let
          package = builtins.fromJSON (builtins.readFile ./package.json);
          inherit (package) version;
          src = ./.;
        in
        {
          default = pkgs.callPackage ./nix/package.nix { inherit version src; };
        }
      );
      formatter = forEachSupportedSystem (
        pkgs: treefmtEval.${pkgs.stdenv.hostPlatform.system}.config.build.wrapper
      );
      checks = forEachSupportedSystem (pkgs: {
        formatting = treefmtEval.${pkgs.stdenv.hostPlatform.system}.config.build.check self;
      });
    };
}
