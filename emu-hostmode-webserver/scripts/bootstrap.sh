#!/bin/sh

# set up tmp dir
echo "@ [1] Setting up temp workspace @"
mkdir -p tmp
cd tmp
echo "* Done! *"
echo ""

# get latest source
echo "@ [2] Retrieving source from SVN @"
svn export --force http://subversion.palm.com/main/tools/Tri-Brick/trunk/ Tri-Brick
if [ $? -ne 0 ]; then
    echo "XXX Fatal Error: svn export failed! This script MUST have local LAN or VPN access. XXX"
    exit 255
fi
zip -r Tri-Brick.zip Tri-Brick/
echo "* Done! *"
echo ""

# retrieve submission #
echo "@ [3] Retrieving submission no. @"
submission=$(novacom run file://"/bin/ls /usr/palm/frameworks/mojo/submissions/")
echo "* Done! Submission # is: ($submission) *"
echo ""

# grab service_emulation.js
echo "@ [4] Retrieving unpatched service_emulation.js @"
novacom get file:///usr/palm/frameworks/mojo/submissions/$submission/javascripts/service_emulation.js > service_emulation.js
echo "* Done! *"
echo ""

# monkey patch
echo "@ [5] Begin monkey patching @"
cp service_emulation.js service_emulation.orig
novacom put file:///usr/palm/frameworks/mojo/submissions/$submission/javascripts/service_emulation.orig < service_emulation.orig
patch -p0 service_emulation.js < ../../patch/200.57/service_emulation.patch
echo "* Done! *"
echo ""

# put service_emulation.js back
echo "@ [6] Putting it back @"
novacom put file:///usr/palm/frameworks/mojo/submissions/$submission/javascripts/service_emulation.js < service_emulation.js
novacom put file://tmp/Tri-Brick.zip < Tri-Brick.zip
novacom run file://"/usr/bin/unzip /tmp/Tri-Brick.zip -d /tmp"
novacom run file://"/bin/rm /tmp/Tri-Brick.zip"
#novacom run file://"/bin/ls /tmp/Tri-Brick"
echo "* Done! *"
echo ""

# restart LunaSysMgr
echo "@ [7] Restarting LunaSysMgr @"
novacom run file://"/sbin/stop LunaSysMgr"
novacom run file://"/sbin/start LunaSysMgr"
echo "* Done! *"
echo ""

# cleanup tmp dir
echo "@ [8] Cleaning up @"
cd ..
rm -rf tmp
echo "* Done! *"
echo ""

