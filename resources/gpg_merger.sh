#!/bin/bash

files_to_process=""
path=""
file_list_path=""
uid_param=""

if [ $# -eq 0 ]
  then
    echo "No arguments supplied"
  else
    arg1=$1
    arg2=$2
    if [ -z "$3" ]; 
    then 
     arg3=""
    else
      arg3=$3
    fi
    if [[ $OSTYPE == 'darwin'* ]]; 
        then
        macOSReplacementAppSupportValue="App_Supp_Folder"
        macOSRealAppSupportFolderValue="Application Support"
        file_list_path="${arg1//$macOSReplacementAppSupportValue/$macOSRealAppSupportFolderValue}"
        path="${arg2//$macOSReplacementAppSupportValue/$macOSRealAppSupportFolderValue}"
        uid_param="$arg3"
        else
        file_list_path="$arg1"
        path="$arg2"
        uid_param="$arg3"
    fi
fi

output=$path"/output"
mkdir -p "$output"

rm -r "$output/*" 2> /dev/null
merged_file="/generated_merged_file"
decrypt_file="/decrypted_temp.txt"

final_merged_file="$output$merged_file"
tmp_decrypted_file="$output$decrypt_file"

rm -f "$final_merged_file" 2> /dev/null

tmp_final_execution="/exec_callback.tmp"
final_callback_execution_file="$output$tmp_final_execution"
tmp_final_unencrypted_execution="/exec_callback_ue.tmp"
final_callback__unencrypted_execution_file="$output$tmp_final_unencrypted_execution"

rm "$final_callback_execution_file" 2> /dev/null
rm "$final_callback__unencrypted_execution_file"  2> /dev/null

touch "$final_merged_file"
> "$final_merged_file"
files_to_process=()

while IFS= read -r line; do
    files_to_process+=("$line")
done < "$file_list_path"

printf "############### Begin Document ###############\n" >> "$final_merged_file"
for file in "${files_to_process[@]}"
do
file_extension="${file: -4}"
if [ $file_extension == ".gpg" ]
then
  gpg -q --batch --yes --output "$tmp_decrypted_file" --decrypt "$file"
  printf  "\n\n//////////// begin $file ////////////\n\n" >> "$final_merged_file"
  cat "$tmp_decrypted_file" | while read line; do 
    echo "$line">>"$final_merged_file"
  done
  printf  "\n\n--------------- End $file ---------------\n\n" >> "$final_merged_file"
elif [ $file_extension == ".txt" ]
then
  printf  "\n\n//////////// start $file ////////////\n\n" >> "$final_merged_file"
  cat "$file" | while read line; do 
    echo "$line">>"$final_merged_file"
  done
  printf  "\n\n--------------- End $file --------------\n\n" >> "$final_merged_file"
fi
done

printf "\n############### End Document ###############\n" >> "$final_merged_file"
latest_modification_dir=$(date +'%m/%d/%Y - %k:%m:%S %Z')
printf "latest modification: $latest_modification_dir \n\n" >> "$final_merged_file"

rm -f "$tmp_decrypted_file"  2> /dev/null

if [ -z "$uid_param" ]
then
    echo "Enter the uid related to your gpg key"
    read uid_param
fi

echo "1234" | gpg  --batch --yes -r $uid_param -e "$final_merged_file"
return_code=$?
if [ "$return_code" = 0 ]; then
echo "Valid passphrase has been set in gpg-agent"
rm "$final_merged_file" 2> /dev/null
touch "$final_callback_execution_file"
exit 0
else
echo "Invalid passphrase or no passphrase is set in gpg-agent"
touch "$final_callback__unencrypted_execution_file"
exit 0
fi
fi