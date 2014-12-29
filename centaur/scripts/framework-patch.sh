#!/bin/sh

fwpath="/usr/palm/frameworks/mojo"
tempdir="tmp-XXYYZZ"

submission=$(novacom run file://"/bin/ls $fwpath/submissions")
if [ x"$submission" = x"" ];
then
    echo "XXX Fatal error: Unable to retrieve via novacom (Check novacom connection) XXX"
    exit 255
fi

# create tmp workspace
mkdir -p "$tempdir"
if [ ! -d "$tempdir" ];
then
    echo "XXX Fatal error: Unable to rereate tempdir ($tempdir) XXX"
    exit 255
fi
    
# retrieve prototype.js   
novacom get file://"$fwpath/submissions/$submission/javascripts/prototype.js" > "$tempdir/prototype.js.orig"
if [ ! -e "$tempdir/prototype.js.orig" ];
then
    echo "XXX Fatal error: novacom get file://$fwpath/submissions/$submission/javascripts/prototype.js failed! XXX"
    exit 255
fi


echo " @ Checking for 1st patch - this._getHeaderJSON() ..."
sig=$(grep "//this._getHeaderJSON();" "$tempdir/prototype.js.orig")

if [ x"$sig" = x"" ]; 
then
    # signature not found, so we need to patch this
    echo "    * Patching prototype.js (this._getHeaderJSON()) ..."
   
    cat "$tempdir/prototype.js.orig" | sed 's/this._getHeaderJSON();/"{}".evalJSON(); \/\/this._getHeaderJSON();/g' > "$tempdir/prototype_new.js"    

    echo "    * Done."
else 
    # no patch needed
    echo "    * Looks like prototype.js is already patched for (this._getHeaderJSON()) ..."
    
    cat "$tempdir/prototype.js.orig" > "$tempdir/prototype_new.js"
fi
echo " @ Done"


echo " @ Checking for 2nd patch - this.request(url) ..."
sig=$(grep "//this.request(url);" "$tempdir/prototype.js.orig")
    
if [ x"$sig" = x"" ];
then
    echo "    * Patching prototype.js (this.request(url)) ..."
    
    cat "$tempdir/prototype_new.js" | sed "s/this.request(url);/this.request((url.search(\/http:\\\\\/\\\\\/localhost:\/)!==-1 ? url : url.substr(0,7)=='http:\\/\\/' ? '\\/proxy?proxy='+encodeURIComponent(url) : url)); \/\/this.request(url);/g" > "$tempdir/prototype_new_new.js"

    echo "    * Done."
else 
    echo "    * Looks like prototype.js is already patched for (this.request(url)) ..."
    
    cat "$tempdir/prototype_new.js" > "$tempdir/prototype_new_new.js"
fi
echo " @ Done"


if [ -e "$tempdir/prototype_new_new.js" ];
then
    echo " * Done patching prototype.js. Now putting prototype.js back ..."
    novacom put file://"$fwpath/submissions/$submission/javascripts/prototype.js" < "$tempdir/prototype_new_new.js"
    novacom put file://"$fwpath/submissions/$submission/javascripts/prototype.js.orig" < "$tempdir/prototype.js.orig"
fi

    
# cleanup
rm -rf "$tempdir"
    
echo ""
echo " * All Done !!!"
