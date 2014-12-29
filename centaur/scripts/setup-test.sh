#!/bin/sh

# Script to set up triton socket stress test 
# use this script for emulator only ...

# set up tmp dir
echo "@ [1] Setting up temp workspace @"
mkdir -p tmp
cd tmp
echo "* Done! *"
echo ""

# get test images
echo "@ [2] Retrieving test images from SVN @"
svn export --force http://subversion.palm.com/main/tools/webos/palm/centaur/trunk/test/doc_root/ doc_root
if [ $? -ne 0 ]; then
    echo "XXX Fatal Error: svn export failed! This script MUST have local LAN or VPN access. XXX"
    exit 255
fi
zip -r test.zip doc_root/
echo "* Done! *"
echo ""

# copy test.zip over to emulator
echo "@ [3] Copying to emulator @"
novacom put file://tmp/test.zip < test.zip
novacom run file://"/usr/bin/unzip -o /tmp/test.zip -d /tmp"
echo "* Done! *"
echo ""

# restart LunaSysMgr
echo "@ [4] Restarting LunaSysMgr @"
novacom run file://"/sbin/stop LunaSysMgr"
novacom run file://"/sbin/start LunaSysMgr"
echo "* Done! *"
echo ""

# cleanup tmp dir
echo "@ [5] Cleaning up @"
cd ..
rm -rf tmp
echo "* Done! *"
echo ""

