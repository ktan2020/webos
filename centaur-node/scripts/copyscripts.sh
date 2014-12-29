#!/bin/sh

cd $(dirname $0)
       
novacom run file://"/bin/rm -rf /usr/palm/tools/centaur-node"

DIRS=$(ls -R ../lib ../dep ../mapping | grep -v ".svn" | grep ":" | sed 's/\.\.//' | sed 's/://')

for D in $DIRS; do
    echo "Creating $D dir in emulator ..."
    novacom run file://"/bin/mkdir -p /usr/palm/tools/centaur-node/$D"
done

files=$(ls ../dep/*/* ../mapping/*.js ../mapping/*/* ../lib/*.js ../*.js)
#echo $files

for f in $files; do
    nf=$(echo $f | sed 's/\.\.//')

    echo " *** Copying ($f) to /usr/palm/tools/centaur-node$nf ***"
    novacom put "file:///usr/palm/tools/centaur-node""$nf" < $f
done

echo "! Done !"

