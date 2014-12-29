#!/bin/sh

# set up tmp dir
echo "@ [1] Setting up temp workspace @"
mkdir -p tmp
cd tmp
echo "* Done! *"
echo ""

# get latest source
echo "@ [2] Retrieving source from SVN @"
svn export --force http://subversion.palm.com/main/tools/webos/palm/centaur/trunk/ centaur
if [ $? -ne 0 ]; then
    echo "XXX Fatal Error: svn export failed! This script MUST have local LAN or VPN access. XXX"
    exit 255
fi
zip -r centaur.zip centaur/
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
novacom put file://tmp/centaur.zip < centaur.zip
novacom run file://"/usr/bin/unzip -o /tmp/centaur.zip -d /tmp"
novacom run file://"/bin/rm /tmp/centaur.zip"
novacom run file://"/bin/chmod +x /tmp/centaur/scripts/palm-host"
#novacom run file://"/bin/ls /tmp/centaur"
echo "* Done! *"
echo ""

# check for dependencies, start test service
echo "@ [7] Checking for dropbear @"
dropbear=$(novacom run file://"/usr/bin/ipkg list dropbear")
if [ "$dropbear"x = ""x ]; then
    echo "* Warning: dropbear not present! We need to install it *"
    novacom run file://"/usr/bin/ipkg install /tmp/centaur/ipkg/dropbear_0.49-r3_i686.ipk"
else
    echo "* Good news! dropbear is already installed *"
fi
#echo "@ [7b] Starting a dummy test service @"
#novacom run file://"/tmp/centaur/test/servers/test_service.sh"
#echo "@ [7c] Starting webOS Http server @"
#novacom run file://"/tmp/centaur/scripts/palm-host"
echo "* Done! *"
echo ""

# restart LunaSysMgr
echo "@ [8] Restarting LunaSysMgr @"
novacom run file://"/sbin/stop LunaSysMgr"
novacom run file://"/sbin/start LunaSysMgr"
echo "* Done! *"
echo ""

# cleanup tmp dir
echo "@ [9] Cleaning up @"
cd ..
rm -rf tmp
echo "* Done! *"
echo ""

