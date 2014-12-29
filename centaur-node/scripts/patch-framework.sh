#!/bin/sh

MOJO2SUB=$(novacom run file://"/bin/ls /usr/palm/frameworks/mojo2/submissions/")
MOJOCORESUB=$(novacom run file://"/bin/ls /usr/palm/frameworks/mojo.core/submission" | head -n 1)
    
# check mojo.core
echo "@@@ Checking mojo.core for patching ..."
MOJOCOREFILES=$(ls ../mapping/mojo.core/*.js)
for f in $MOJOCOREFILES; 
do
    FILE=$(basename $f)
    echo " * Checking file: $FILE"
    dif=$(novacom get file://"/usr/palm/frameworks/mojo.core/submission/$MOJOCORESUB/javascript/$FILE" | diff -w $f -)
    
    if [ x"$dif" == x"" ]; then
        echo "   Great! File is up to date. "
    else
        echo "   Oops ... updating $FILE ..."
        novacom put file://"/usr/palm/frameworks/mojo.core/submission/$MOJOCORESUB/javascript/$FILE" < $f
        echo "   Update done. "
    fi
done

# check mojo2
echo "\n@@@ Checking mojo2 for patching ..."
MOJO2FILES=$(ls ../mapping/mojo2/*.js)
    
for f in $MOJO2FILES;
do
    FILE=$(basename $f)
    echo " * Checking file: $FILE"
    dif=$(novacom get file://"/usr/palm/frameworks/mojo2/submissions/$MOJO2SUB/javascripts/$FILE" | diff -w $f -)
    
    if [ x"$dif" == x"" ]; then
        echo "   Great! File is up to date. "
    else
        echo "   Oops ... updating $FILE ..."
        novacom put file://"/usr/palm/frameworks/mojo2/submissions/$MOJO2SUB/javascripts/$FILE" < $f
        echo "   Update done. "
     fi
done

echo "@@@ Done @@@"
    
