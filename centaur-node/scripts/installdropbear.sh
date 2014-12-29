#!/bin/sh

echo "@ [*] Checking for dropbear @"
dropbear=$(novacom run file://"/usr/bin/ipkg list dropbear")
if [ "$dropbear"x = ""x ]; then
    echo "* Warning: dropbear not present! We need to install it *"
    novacom put file://"/tmp/dropbear_0.49-r3_i686.ipk" < ../ipkg/dropbear_0.49-r3_i686.ipk
    novacom run file://"/usr/bin/ipkg install /tmp/dropbear_0.49-r3_i686.ipk"
else
    echo "* Good news! dropbear is already installed nothing more to do ... *"
fi

echo "@ Done! @"
