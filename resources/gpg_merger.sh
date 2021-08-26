#!/bin/bash

files_to_process=""
path=""
file_list_path=""

if [ $# -eq 0 ]
  then
    echo "No arguments supplied"
  else
    arg1=$1
    arg2=$2
    # arg3=$3
    if [[ $OSTYPE == 'darwin'* ]]; 
        then
        macOSReplacementAppSupportValue="App_Supp_Folder"
        macOSRealAppSupportFolderValue="Application Support"
        file_list_path="${arg1//$macOSReplacementAppSupportValue/$macOSRealAppSupportFolderValue}"
        path="${arg2//$macOSReplacementAppSupportValue/$macOSRealAppSupportFolderValue}"
        else
        file_list_path="$arg1"
        path="$arg2"
    fi
fi

output=$path"/output"
mkdir -p "$output"

rm -r "$output/*"
merged_file="/generated_merged_file"
decrypt_file="/decrypted_temp.txt"

final_merged_file="$output$merged_file"
tmp_decrypted_file="$output$decrypt_file"

rm -f "$final_merged_file"

tmp_final_execution="/exec_callback.tmp"
final_callback_execution_file="$output$tmp_final_execution"
tmp_final_unencrypted_execution="/exec_callback_ue.tmp"
final_callback__unencrypted_execution_file="$output$tmp_final_unencrypted_execution"

rm "$final_callback_execution_file"
rm "$final_callback__unencrypted_execution_file"

touch "$final_merged_file"
> "$final_merged_file"
files_to_process=()

while IFS= read -r line; do
    echo "Text read from file: $line"
    files_to_process+=("$line")
done < "$file_list_path"

printf "############### Begin Document ###############\n" >> "$final_merged_file"

for file in "${files_to_process[@]}"
do
file_extension="${file: -4}"
if [ $file_extension == ".gpg" ]
then
  echo "📘 $file processing..."
  gpg -q --batch --yes --output "$tmp_decrypted_file" --decrypt "$file"
  echo "📗: $file has been processed."
  printf  "\n\n//////////// begin $file ////////////\n\n" >> "$final_merged_file"
  cat "$tmp_decrypted_file" | while read line; do 
    echo "$line">>"$final_merged_file"
  done
  printf  "\n\n--------------- end $file ---------------\n\n" >> "$final_merged_file"
elif [ $file_extension == ".txt" ]
then
  echo "📘 $file processing..."
  printf  "\n\n//////////// start $file ////////////\n\n" >> "$final_merged_file"
  cat "$file" | while read line; do 
    echo "$line">>"$final_merged_file"
  done
  printf  "\n\n--------------- end $file --------------\n\n" >> "$final_merged_file"
  echo "📗: $file has been processed"
elif [ $file_extension == ".sh" ]
then
  echo "📔: \n script file ignored"
else
  echo "📕: file ignored --> $file is neither a gpg or a txt file" 
fi
done

printf "\n############### End Document ###############\n" >> "$final_merged_file"
latest_modification_dir=$(date +'%m/%d/%Y - %k:%m:%S %Z')
printf "latest modification: $latest_modification_dir \n\n" >> "$final_merged_file"

rm -f "$tmp_decrypted_file"

## Preview Request (to verify the above operation)
preview_question="Do you wish to preview the final file before the final step (recommanded) ?"
read -r -p "$preview_question [y/N] " response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]
then
    cat "$final_merged_file"
fi

encrypt_question="Do you wish to encrypt your merged file ?"
read -r -p "$encrypt_question [y/N] " response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]
then
    echo "Enter the uid related to your gpg key"
    read uid
    echo "1234" | gpg  --batch --yes -r $uid -e "$final_merged_file"
    return_code=$?
    if [ "$return_code" = 0 ]; then
        echo "Valid passphrase has been set in gpg-agent"
        rm "$final_merged_file"
        touch "$final_callback_execution_file"
        exit 0
        else
         echo "Invalid passphrase or no passphrase is set in gpg-agent"
        touch "$final_callback__unencrypted_execution_file"
        exit 0
    fi
else
    touch "$final_callback__unencrypted_execution_file"
    exit 0
fi