#!/bin/sh

# set up tmp dir
echo "@ [1] Setting up temp workspace @"
mkdir -p tmp
cd tmp
echo "* Done! *"
echo ""

# get latest source
echo "@ [2] Retrieving source from SVN @"
svn export --force http://subversion.palm.com/main/tools/webos/palm/centaur-node/trunk/ centaur-node
if [ $? -ne 0 ]; then
    echo "XXX Fatal Error: svn export failed! This script MUST have local LAN or VPN access. XXX"
    exit 255
fi
zip -r centaur-node.zip centaur-node/
echo "* Done! *"
echo ""

# install
echo "@ [3] Installing @"
novacom run file://"/bin/rm -f /tmp/centaur-node.zip"
novacom put file:///tmp/centaur-node.zip < centaur-node.zip
novacom run file://"/usr/bin/unzip -o /tmp/centaur-node.zip -d /usr/palm/tools"
novacom run file://"/bin/rm -f /tmp/centaur-node.zip"
echo "* Done! *"
echo ""

# check for dependencies, start test service
echo "@ [4] Checking for dropbear @"
dropbear=$(novacom run file://"/usr/bin/ipkg list dropbear")
if [ "$dropbear"x = ""x ]; then
    echo "* Warning: dropbear not present! We need to install it *"
    novacom run file://"/usr/bin/ipkg install /usr/palm/tools/centaur-node/ipkg/dropbear_0.49-r3_i686.ipk"
else
    echo "* Good news! dropbear is already installed *"
fi

# restart LunaSysMgr
echo "@ [5] Restarting LunaSysMgr @"
novacom run file://"/sbin/stop LunaSysMgr"
novacom run file://"/sbin/start LunaSysMgr"
echo "* Done! *"
echo ""

# cleanup tmp dir
echo "@ [6] Cleaning up @"
cd ..
rm -rf tmp
echo "* Done! *"
echo ""



