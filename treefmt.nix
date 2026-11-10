{ pkgs, ... }:
{
  projectRootFile = "flake.nix";
  programs.statix.enable = true;
  programs.nixfmt.enable = true;
  programs.prettier.enable = true;
}
