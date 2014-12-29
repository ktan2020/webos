#!/bin/sh

DEST="/usr/palm/applications"

cd ../test/apps

DIRS=$(ls)
#echo $DIRS

for D in $DIRS; do
    N="$D.zip"
    zip -r "$N" "$D"
    
    novacom put file://"/tmp/$N" < $N
    novacom run file://"/usr/bin/unzip -o /tmp/$N -d $DEST"
done

novacom run file://"/sbin/stop LunaSysMgr"
novacom run file://"/sbin/start LunaSysMgr"

rm *.zip

