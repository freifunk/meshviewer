{
  src,
  version,
  buildNpmPackage,
  importNpmLock,
  ...
}:
buildNpmPackage (finalAttrs: {
  pname = "freifunk-meshviewer";
  inherit version src;

  npmDeps = importNpmLock { npmRoot = src; };
  npmConfigHook = importNpmLock.npmConfigHook;

  installPhase = ''
    mkdir -p $out
    cp -r build/* $out/
  '';
})
