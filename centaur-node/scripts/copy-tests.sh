#!/bin/sh

DEST="/home/root/testapps"
cd ..

LS=$(novacom run file://"/bin/ls $DEST")
    
if [ x"$LS" = x"" ]; then
    echo "$LS does not exist, creating it ..."
    novacom run file://"/bin/mkdir -p $DEST"
fi    

DIRS=$(ls test/apps/)
    
for DIR in $DIRS; do
    
    echo "... copying $DIR to target ..."
    tar c -C test/apps $DIR | novacom run file://"/bin/tar xv -C $DEST"

done

echo "Done!"
