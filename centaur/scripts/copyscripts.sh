#!/bin/sh

cd $(dirname $0)

files=$(ls ../include/*.js ../main.js)
#echo $files

for f in $files; do
    nf=$(echo $f | sed 's/\.\.//')

    echo " *** Copying ($f) ($nf) to /usr/palm/tools/centaur/ ***"
    novacom put "file:///usr/palm/tools/centaur""$nf" < $f
done

echo "! Done !"
