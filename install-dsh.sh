#!/bin/sh
# Installs the AiST plugins and profile patch into ~/.dsh/profiles/web (run after `npx @deepseek-ai/dsh web` created the profile).
set -e
cd "$(dirname "$0")"
P=~/.dsh/profiles/web
mkdir -p "$P/plugins" "$P/node_modules"
for d in aist-brand aist-locale-ru aist-settings-assistant; do
  rm -rf "$P/plugins/$d"; cp -R "dsh/plugins/$d" "$P/plugins/$d"
done
ln -sfn ../plugins/aist-brand "$P/node_modules/dsh-client-ui-brand-aist"
ln -sfn ../plugins/aist-locale-ru "$P/node_modules/dsh-client-locale-ru"
ln -sfn ../plugins/aist-settings-assistant "$P/node_modules/dsh-client-ui-settings-aist"
cp dsh/cordis.patch.yml "$P/cordis.patch.yml"
echo "installed into $P; restart dsh web"
