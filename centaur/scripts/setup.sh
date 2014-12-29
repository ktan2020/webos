#!/bin/sh

dir="/usr/palm/applications"
#apps="com.palm.app.photos com.palm.app.musicplayer"

apps=$(novacom run file://"/bin/ls $dir")

file="real.html"
indexhtml="index.html"

for app in $apps; 
do
    echo " * Checking $app folder ..."
    
    ls=$(novacom run file://"/bin/ls $dir/$app/$indexhtml" 2>&1)
        
    case $ls in
        *No\ such\ file*) 
        echo "\t *** index.html not found in ($dir/$app). Attempting to fix ... "
        novacom run file://"/bin/ln -s $dir/$app/$file $dir/$app/$indexhtml"
        echo "\t ... done creating symlink ***"
        
        index=$(novacom get file://"$dir/$app/$indexhtml")
        
        if [ x"$index" = x"" ]; 
        then
            echo "XXX Serious error: Unable to verify symlink creation !!! XXX"; 
            exit 255;
        fi
        ;;
    esac
    
done

echo ""
echo "setup Done !!!"
