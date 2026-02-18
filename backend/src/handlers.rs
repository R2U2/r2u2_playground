use std::convert::Infallible;
use std::fs;
use std::io::prelude::*;
use std::path::PathBuf;
use std::process::Command;

use warp::{self, http::StatusCode};

use crate::models::{r2u2_output_with_timestamp, r2u2_contract_with_timestamp, R2U2_Reply, R2U2_Request, C2PO_Reply};
use crate::compile;


pub async fn run(request: R2U2_Request) -> Result<impl warp::Reply, Infallible> {
    println!("We are running the run handler!");
    let mut reply = R2U2_Reply::default();
    let random_c2po_file_name = srfng::Generator::new().generate().as_str().to_owned()+".c2po";
    let random_trace_file_name = srfng::Generator::new().generate().as_str().to_owned()+".csv";

    let mut c2po_file: fs::File = fs::File::create(&random_c2po_file_name).expect("Error creating output fs::File");
    let _ = c2po_file.write_all(request.c2po_text.as_bytes());

    let mut trace_file: fs::File = fs::File::create(&random_trace_file_name).expect("Error creating output fs::File");
    let _ = trace_file.write_all(request.trace_text.as_bytes());

    let spec_file: Vec<u8>;
    let random_spec_file_name = srfng::Generator::new().generate().as_str().to_owned() + ".bin";
    let (assembly, error) = compile::c2po_compile(&random_c2po_file_name,
        &random_trace_file_name,
        "",
        "",
        &random_spec_file_name,
        "",
        request.booleanizer_enabled,
        request.aux_enabled,
        request.rewrite_enabled,
        request.cse_enabled,
        request.sat_enabled,
        request.sat_timeout,
        );
    reply.assembly_text = assembly;
    reply.error = error;
    if error {
        return Ok(warp::reply::with_header(
            warp::reply::json(&reply),/* data to send */
            "Access-Control-Allow-Origin", "*"       // This is the important bit
        ));
    }
    let new_spec = PathBuf::from("./".to_owned() + &random_spec_file_name);
    spec_file = fs::read(new_spec).expect("Error opening specification fs::File");
    let _ = fs::remove_file("./".to_owned() + &random_spec_file_name);

    let mut monitor = r2u2_core::get_monitor(&spec_file);

    let signal_file: fs::File = fs::File::open(&random_trace_file_name).expect("Error opening signal CSV fs::File");
    let mut reader = csv::ReaderBuilder::new().trim(csv::Trim::All).has_headers(true).from_reader(signal_file);
    
    let mut timestamp = 0;
    for result in reader.records() {
        let record = &result.expect("Error reading signal values");
        let first_element = record.get(0).expect("Error reading signal values");
        if first_element.starts_with('@') {
            let end_idx = first_element.find(" ").unwrap_or(1);
            match first_element[1..end_idx].parse::<u32>() {
                Ok(n) => { 
                    monitor.time_stamp = n; 
                    timestamp = n;
                }
                Err(_e) => {}
            }
            r2u2_core::load_string_signal(&mut monitor, 0, &first_element[end_idx+1..first_element.len()]);
        } else {
            r2u2_core::load_string_signal(&mut monitor, 0, record.get(0).expect("Error reading signal values"));
        }
        for n in 1..record.len(){
            r2u2_core::load_string_signal(&mut monitor, n, record.get(n).expect("Error reading signal values"));
        }
        if r2u2_core::monitor_step(&mut monitor) {
            for out in r2u2_core::get_output_buffer(&monitor) {
                let output =  r2u2_output_with_timestamp{
                        timestamp_produced: timestamp,
                        spec_num: out.spec_num,
                        spec_str: out.spec_str.as_str().to_owned(),
                        time_index: out.verdict.time,
                        truth: out.verdict.truth,
                };
                reply.verdicts.push(output);
            }
            for out in r2u2_core::get_contract_buffer(&monitor) {
                let output =  r2u2_contract_with_timestamp{
                        timestamp_produced: timestamp,
                        spec_str: out.spec_str.as_str().to_owned(),
                        time_index: out.time,
                        status: out.status,
                };
                reply.contracts.push(output);
            }
        } else {
            reply.error = true;
        }
        timestamp = timestamp + 1;
    }
    
    let _ = fs::remove_file("./".to_owned() + &random_c2po_file_name);
    let _ = fs::remove_file("./".to_owned() + &random_trace_file_name);
    println!("We are now sending response!");
    Ok(warp::reply::with_header(
        warp::reply::json(&reply),/* data to send */
        "Access-Control-Allow-Origin", "*"       // This is the important bit
    ))
}

pub async fn compile(request: R2U2_Request) -> Result<impl warp::Reply, Infallible> {
    println!("We are running the compile handler!");
    let mut reply = C2PO_Reply::default();
    let random_c2po_file_name = srfng::Generator::new().generate().as_str().to_owned()+".c2po";
    let random_trace_file_name = srfng::Generator::new().generate().as_str().to_owned()+".csv";

    let mut c2po_file: fs::File = fs::File::create(&random_c2po_file_name).expect("Error creating output fs::File");
    let _ = c2po_file.write_all(request.c2po_text.as_bytes());

    let mut trace_file: fs::File = fs::File::create(&random_trace_file_name).expect("Error creating output fs::File");
    let _ = trace_file.write_all(request.trace_text.as_bytes());

    let random_spec_file_name = srfng::Generator::new().generate().as_str().to_owned() + ".bin";
    let (assembly, error) = compile::c2po_compile(&random_c2po_file_name,
        &random_trace_file_name,
        "",
        "",
        &random_spec_file_name,
        "",
        request.booleanizer_enabled,
        request.aux_enabled,
        request.rewrite_enabled,
        request.cse_enabled,
        request.sat_enabled,
        request.sat_timeout,
        );
    reply.assembly_text = assembly;
    reply.error = error;
    let _ = fs::remove_file("./".to_owned() + &random_c2po_file_name);
    let _ = fs::remove_file("./".to_owned() + &random_trace_file_name);
    let _ = fs::remove_file("./".to_owned() + &random_spec_file_name);
    
    println!("We are now sending response!");
    Ok(warp::reply::with_header(
        warp::reply::json(&reply),/* data to send */
        "Access-Control-Allow-Origin", "*"       // This is the important bit
    ))
}

pub async fn download_bin(request: R2U2_Request) -> Result<impl warp::Reply, Infallible> {
    println!("We are running the compile bin handler!");
    let mut reply = C2PO_Reply::default();
    let random_c2po_file_name = srfng::Generator::new().generate().as_str().to_owned()+".c2po";
    let random_trace_file_name = srfng::Generator::new().generate().as_str().to_owned()+".csv";

    let mut c2po_file: fs::File = fs::File::create(&random_c2po_file_name).expect("Error creating output fs::File");
    let _ = c2po_file.write_all(request.c2po_text.as_bytes());

    let mut trace_file: fs::File = fs::File::create(&random_trace_file_name).expect("Error creating output fs::File");
    let _ = trace_file.write_all(request.trace_text.as_bytes());

    let random_spec_file_name = srfng::Generator::new().generate().as_str().to_owned() + ".bin";
    let (assembly, error) = compile::c2po_compile(&random_c2po_file_name,
        &random_trace_file_name,
        "",
        "",
        &random_spec_file_name,
        "",
        request.booleanizer_enabled,
        request.aux_enabled,
        request.rewrite_enabled,
        request.cse_enabled,
        request.sat_enabled,
        request.sat_timeout,
        );
    reply.assembly_text = assembly;
    reply.error = error;
    if error {
        return Ok(warp::reply::with_header(
            warp::reply::json(&reply),/* data to send */
            "Access-Control-Allow-Origin", "*"       // This is the important bit
        ));
    }
    let new_spec = PathBuf::from("./".to_owned() + &random_spec_file_name);
    reply.download_text = String::from_utf8_lossy(&fs::read(new_spec).expect("Error opening specification fs::File")).to_string();
    let _ = fs::remove_file("./".to_owned() + &random_c2po_file_name);
    let _ = fs::remove_file("./".to_owned() + &random_trace_file_name);
    let _ = fs::remove_file("./".to_owned() + &random_spec_file_name);

    println!("We are now sending response!");
    Ok(warp::reply::with_header(
        warp::reply::json(&reply), /* data to send */
        "Access-Control-Allow-Origin", "*"       // This is the important bit
    ))
}

pub async fn download_c(request: R2U2_Request) -> Result<impl warp::Reply, Infallible> {
    println!("We are running the compile c handler!");
    let mut reply = C2PO_Reply::default();
    let random_c2po_file_name = srfng::Generator::new().generate().as_str().to_owned()+".c2po";
    let random_trace_file_name = srfng::Generator::new().generate().as_str().to_owned()+".csv";

    let mut c2po_file: fs::File = fs::File::create(&random_c2po_file_name).expect("Error creating output fs::File");
    let _ = c2po_file.write_all(request.c2po_text.as_bytes());

    let mut trace_file: fs::File = fs::File::create(&random_trace_file_name).expect("Error creating output fs::File");
    let _ = trace_file.write_all(request.trace_text.as_bytes());

    let random_spec_file_name = srfng::Generator::new().generate().as_str().to_owned() + ".bin";
    let (assembly, error) = compile::c2po_compile(&random_c2po_file_name,
        &random_trace_file_name,
        "",
        "",
        &random_spec_file_name,
        "",
        request.booleanizer_enabled,
        request.aux_enabled,
        request.rewrite_enabled,
        request.cse_enabled,
        request.sat_enabled,
        request.sat_timeout,
        );
    reply.assembly_text = assembly;
    reply.error = error;
    if error {
        return Ok(warp::reply::with_header(
            warp::reply::json(&reply),/* data to send */
            "Access-Control-Allow-Origin", "*"       // This is the important bit
        ));
    }

    let output = Command::new("xxd")
        .args(["-i", &random_spec_file_name]).output().expect("Error compiling to C header file");

    let mut array_name = "__".to_owned();
    array_name.push_str(&random_spec_file_name[..random_spec_file_name.len()-4]);
    array_name.push_str("_bin");

    reply.download_text = str::replace(&String::from_utf8_lossy(&output.stdout).to_string(), &array_name, "spec");
    
    let _ = fs::remove_file("./".to_owned() + &random_c2po_file_name);
    let _ = fs::remove_file("./".to_owned() + &random_trace_file_name); 
    let _ = fs::remove_file("./".to_owned() + &random_spec_file_name);

    println!("We are now sending response!");
    Ok(warp::reply::with_header(
        warp::reply::json(&reply), /* data to send */
        "Access-Control-Allow-Origin", "*"       // This is the important bit
    ))
}

pub async fn download_rust(request: R2U2_Request) -> Result<impl warp::Reply, Infallible> {
    println!("We are running the compile rust handler!");
    let mut reply = C2PO_Reply::default();
    let random_c2po_file_name = srfng::Generator::new().generate().as_str().to_owned()+".c2po";
    let random_trace_file_name = srfng::Generator::new().generate().as_str().to_owned()+".csv";

    let mut c2po_file: fs::File = fs::File::create(&random_c2po_file_name).expect("Error creating output fs::File");
    let _ = c2po_file.write_all(request.c2po_text.as_bytes());

    let mut trace_file: fs::File = fs::File::create(&random_trace_file_name).expect("Error creating output fs::File");
    let _ = trace_file.write_all(request.trace_text.as_bytes());

    let random_spec_file_name = srfng::Generator::new().generate().as_str().to_owned() + ".bin";
    let (assembly, error) = compile::c2po_compile(&random_c2po_file_name,
        &random_trace_file_name,
        "",
        "",
        &random_spec_file_name,
        "",
        request.booleanizer_enabled,
        request.aux_enabled,
        request.rewrite_enabled,
        request.cse_enabled,
        request.sat_enabled,
        request.sat_timeout,
        );
    reply.assembly_text = assembly;
    reply.error = error;
    if error {
        return Ok(warp::reply::with_header(
            warp::reply::json(&reply),/* data to send */
            "Access-Control-Allow-Origin", "*"       // This is the important bit
        ));
    }

    let output = Command::new("xxd")
        .args(["-i", &random_spec_file_name]).output().expect("Error compiling to C header file");

    let output_text = String::from_utf8_lossy(&output.stdout).to_string();

    let start = output_text.find("{").unwrap() + 1;
    let end = output_text.find("};").unwrap();
    
    let length = output_text[(output_text.find("len = ").unwrap()+6)..output_text.len()-2].to_string();
    
    reply.download_text = "pub const SPEC: [u8; ".to_owned() + &length + "] = ["+&output_text[start..end].to_string()+"];";

    let _ = fs::remove_file("./".to_owned() + &random_c2po_file_name);
    let _ = fs::remove_file("./".to_owned() + &random_trace_file_name); 
    let _ = fs::remove_file("./".to_owned() + &random_spec_file_name);
    
    println!("We are now sending response!");
    Ok(warp::reply::with_header(
        warp::reply::json(&reply), /* data to send */
        "Access-Control-Allow-Origin", "*"       // This is the important bit
    ))
}

pub async fn download_c_bounds(request: R2U2_Request) -> Result<impl warp::Reply, Infallible> {
    println!("We are running the compile bin handler!");
    let mut reply = C2PO_Reply::default();
    let random_c2po_file_name = srfng::Generator::new().generate().as_str().to_owned()+".c2po";
    let random_trace_file_name = srfng::Generator::new().generate().as_str().to_owned()+".csv";

    let mut c2po_file: fs::File = fs::File::create(&random_c2po_file_name).expect("Error creating output fs::File");
    let _ = c2po_file.write_all(request.c2po_text.as_bytes());

    let mut trace_file: fs::File = fs::File::create(&random_trace_file_name).expect("Error creating output fs::File");
    let _ = trace_file.write_all(request.trace_text.as_bytes());

    let random_spec_file_name = srfng::Generator::new().generate().as_str().to_owned() + ".bin";

    let random_bounds_file_name = srfng::Generator::new().generate().as_str().to_owned() + ".h";
    let _ = fs::File::create(&random_bounds_file_name).expect("Error creating output fs::File");
    
    let (assembly, error) = compile::c2po_compile(&random_c2po_file_name,
        &random_trace_file_name,
        "",
        "c",
        &random_spec_file_name,
        &random_bounds_file_name,
        request.booleanizer_enabled,
        request.aux_enabled,
        request.rewrite_enabled,
        request.cse_enabled,
        request.sat_enabled,
        request.sat_timeout,
        );
    reply.error = error;
    if error {
        return Ok(warp::reply::with_header(
            warp::reply::json(&reply),/* data to send */
            "Access-Control-Allow-Origin", "*"       // This is the important bit
        ));
    }
    let new_bounds = PathBuf::from("./".to_owned() + &random_bounds_file_name);
    reply.download_text = String::from_utf8_lossy(&fs::read(new_bounds).expect("Error opening specification fs::File")).to_string();
    
    let _ = fs::remove_file("./".to_owned() + &random_c2po_file_name);
    let _ = fs::remove_file("./".to_owned() + &random_trace_file_name); 
    let _ = fs::remove_file("./".to_owned() + &random_spec_file_name);
    let _ = fs::remove_file("./".to_owned() + &random_bounds_file_name);

    println!("We are now sending response!");
    Ok(warp::reply::with_header(
        warp::reply::json(&reply), /* data to send */
        "Access-Control-Allow-Origin", "*"       // This is the important bit
    ))
}

pub async fn download_rust_bounds(request: R2U2_Request) -> Result<impl warp::Reply, Infallible> {
    println!("We are running the compile bin handler!");
    let mut reply = C2PO_Reply::default();
    let random_c2po_file_name = srfng::Generator::new().generate().as_str().to_owned()+".c2po";
    let random_trace_file_name = srfng::Generator::new().generate().as_str().to_owned()+".csv";

    let mut c2po_file: fs::File = fs::File::create(&random_c2po_file_name).expect("Error creating output fs::File");
    let _ = c2po_file.write_all(request.c2po_text.as_bytes());

    let mut trace_file: fs::File = fs::File::create(&random_trace_file_name).expect("Error creating output fs::File");
    let _ = trace_file.write_all(request.trace_text.as_bytes());

    let random_spec_file_name = srfng::Generator::new().generate().as_str().to_owned() + ".bin";

    let random_bounds_file_name = srfng::Generator::new().generate().as_str().to_owned() + ".toml";
    let _ = fs::File::create(&random_bounds_file_name).expect("Error creating output fs::File");
    
    let (assembly, error) = compile::c2po_compile(&random_c2po_file_name,
        &random_trace_file_name,
        "",
        "rust",
        &random_spec_file_name,
        &random_bounds_file_name,
        request.booleanizer_enabled,
        request.aux_enabled,
        request.rewrite_enabled,
        request.cse_enabled,
        request.sat_enabled,
        request.sat_timeout,
        );
    reply.error = error;
    if error {
        return Ok(warp::reply::with_header(
            warp::reply::json(&reply),/* data to send */
            "Access-Control-Allow-Origin", "*"       // This is the important bit
        ));
    }
    let new_bounds = PathBuf::from("./".to_owned() + &random_bounds_file_name);
    reply.download_text = String::from_utf8_lossy(&fs::read(new_bounds).expect("Error opening specification fs::File")).to_string();
    
    let _ = fs::remove_file("./".to_owned() + &random_c2po_file_name);
    let _ = fs::remove_file("./".to_owned() + &random_trace_file_name); 
    let _ = fs::remove_file("./".to_owned() + &random_spec_file_name);
    let _ = fs::remove_file("./".to_owned() + &random_bounds_file_name);

    println!("We are now sending response!");
    Ok(warp::reply::with_header(
        warp::reply::json(&reply), /* data to send */
        "Access-Control-Allow-Origin", "*"       // This is the important bit
    ))
}