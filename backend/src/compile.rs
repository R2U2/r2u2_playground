use pyo3::prelude::*;
use pyo3::exceptions::PyTypeError;
use pyo3::ffi::c_str;
use pyo3::types::PyTuple;

pub fn c2po_compile(spec_filename: &str,
    trace_filename: &str,
    map_filename: &str,
    output_filename: &str,
    write_bounds_filename: &str,
    enable_booleanizer: bool,
    enable_aux: bool,
    enable_rewrite: bool,
    enable_cse: bool,
    enable_sat: bool,
    timeout_sat: i32)  -> (String, bool) {
    let c2po_code = c_str!(include_str!("../r2u2/compiler/c2po/__init__.py"));
    let log_code = c_str!(include_str!("../r2u2/compiler/c2po/log.py"));
    let types_code = c_str!(include_str!("../r2u2/compiler/c2po/types.py"));
    let stats_code = c_str!(include_str!("../r2u2/compiler/c2po/stats.py"));
    let util_code = c_str!(include_str!("../r2u2/compiler/c2po/util.py"));
    let cpt_code = c_str!(include_str!("../r2u2/compiler/c2po/cpt.py"));
    let command_code = c_str!(include_str!("../r2u2/compiler/c2po/command.py"));
    let lex_code = c_str!(include_str!("../r2u2/compiler/c2po/sly/lex.py"));
    let yacc_code = c_str!(include_str!("../r2u2/compiler/c2po/sly/yacc.py"));
    let sly_code = c_str!(include_str!("../r2u2/compiler/c2po/sly/__init__.py"));
    let desugar_code = c_str!(include_str!("../r2u2/compiler/c2po/desugar.py"));
    let rewrite_code = c_str!(include_str!("../r2u2/compiler/c2po/rewrite.py"));
    let cse_code = c_str!(include_str!("../r2u2/compiler/c2po/cse.py"));
    let transform_code = c_str!(include_str!("../r2u2/compiler/c2po/transform.py"));
    let atomics_code = c_str!(include_str!("../r2u2/compiler/c2po/atomics.py"));
    let scq_code = c_str!(include_str!("../r2u2/compiler/c2po/scq.py"));
    let type_check_code = c_str!(include_str!("../r2u2/compiler/c2po/type_check.py"));
    let assemble_code = c_str!(include_str!("../r2u2/compiler/c2po/assemble.py"));
    let sat_code = c_str!(include_str!("../r2u2/compiler/c2po/sat.py"));
    let parse_egglog_output_code = c_str!(include_str!("../r2u2/compiler/c2po/parse_egglog_output.py"));
    let eqsat_code = c_str!(include_str!("../r2u2/compiler/c2po/eqsat.py"));
    let serialize_code = c_str!(include_str!("../r2u2/compiler/c2po/serialize.py"));
    let parse_mltl_code = c_str!(include_str!("../r2u2/compiler/c2po/parse_mltl.py"));
    let parse_c2po_code = c_str!(include_str!("../r2u2/compiler/c2po/parse_c2po.py"));
    let parse_equiv_code = c_str!(include_str!("../r2u2/compiler/c2po/parse_equiv.py"));
    // egraph.py requires gurobipy; eqsat imports it optionally via try/except
    let sabre_code = c_str!(include_str!("../r2u2/compiler/c2po/sabre.py"));
    let trace_code = c_str!(include_str!("../r2u2/compiler/c2po/trace.py"));
    let map_code = c_str!(include_str!("../r2u2/compiler/c2po/map.py"));
    let r2u2_code = c_str!(include_str!("../r2u2/compiler/c2po/r2u2.py"));
    let wcet_code = c_str!(include_str!("../r2u2/compiler/c2po/wcet.py"));
    let main_code = c_str!(include_str!("../r2u2/compiler/c2po/main.py"));
    let compile_code = c_str!(include_str!("../r2u2/compiler/c2po/main_wrapper.py"));

    let mut assembly: String = "".to_string();
    let from_python = Python::attach(|py| -> PyResult<()> {
        // Import modules in dependency order
        // Base modules (no c2po dependencies)
        PyModule::from_code(py, c2po_code, c_str!("c2po/__init__.py"), c_str!("c2po"))?;
        PyModule::from_code(py, log_code, c_str!("c2po/log.py"), c_str!("c2po.log"))?;
        PyModule::from_code(py, types_code, c_str!("c2po/types.py"), c_str!("c2po.types"))?;
        PyModule::from_code(py, stats_code, c_str!("c2po/stats.py"), c_str!("c2po.stats"))?;
        PyModule::from_code(py, util_code, c_str!("c2po/util.py"), c_str!("c2po.util"))?;
        
        // Modules that depend on base modules
        PyModule::from_code(py, cpt_code, c_str!("c2po/cpt.py"), c_str!("c2po.cpt"))?;
        PyModule::from_code(py, command_code, c_str!("c2po/command.py"), c_str!("c2po.command"))?;
        
        // Sly modules (lexer/parser)
        PyModule::from_code(py, lex_code, c_str!("sly/lex.py"), c_str!("c2po.sly.lex"))?;
        PyModule::from_code(py, yacc_code, c_str!("sly/yacc.py"), c_str!("c2po.sly.yacc"))?;
        PyModule::from_code(py, sly_code, c_str!("sly/__init__.py"), c_str!("c2po.sly"))?;
        
        // Transform and optimization modules
        PyModule::from_code(py, desugar_code, c_str!("c2po/desugar.py"), c_str!("c2po.desugar"))?;
        PyModule::from_code(py, rewrite_code, c_str!("c2po/rewrite.py"), c_str!("c2po.rewrite"))?;
        PyModule::from_code(py, cse_code, c_str!("c2po/cse.py"), c_str!("c2po.cse"))?;
        PyModule::from_code(py, transform_code, c_str!("c2po/transform.py"), c_str!("c2po.transform"))?;
        PyModule::from_code(py, atomics_code, c_str!("c2po/atomics.py"), c_str!("c2po.atomics"))?;
        PyModule::from_code(py, scq_code, c_str!("c2po/scq.py"), c_str!("c2po.scq"))?;
        PyModule::from_code(py, type_check_code, c_str!("c2po/type_check.py"), c_str!("c2po.type_check"))?;
        PyModule::from_code(py, assemble_code, c_str!("c2po/assemble.py"), c_str!("c2po.assemble"))?;
        PyModule::from_code(py, sat_code, c_str!("c2po/sat.py"), c_str!("c2po.sat"))?;
        PyModule::from_code(py, parse_egglog_output_code, c_str!("c2po/parse_egglog_output.py"), c_str!("c2po.parse_egglog_output"))?;
        PyModule::from_code(py, eqsat_code, c_str!("c2po/eqsat.py"), c_str!("c2po.eqsat"))?;
        PyModule::from_code(py, serialize_code, c_str!("c2po/serialize.py"), c_str!("c2po.serialize"))?;
        PyModule::from_code(py, parse_mltl_code, c_str!("c2po/parse_mltl.py"), c_str!("c2po.parse_mltl"))?;
        PyModule::from_code(py, parse_c2po_code, c_str!("c2po/parse_c2po.py"), c_str!("c2po.parse_c2po"))?;
        PyModule::from_code(py, parse_equiv_code, c_str!("c2po/parse_equiv.py"), c_str!("c2po.parse_equiv"))?;
        PyModule::from_code(py, trace_code, c_str!("c2po/trace.py"), c_str!("c2po.trace"))?;
        PyModule::from_code(py, map_code, c_str!("c2po/map.py"), c_str!("c2po.map"))?;
        PyModule::from_code(py, r2u2_code, c_str!("c2po/r2u2.py"), c_str!("c2po.r2u2"))?;
        PyModule::from_code(py, wcet_code, c_str!("c2po/wcet.py"), c_str!("c2po.wcet"))?;
        PyModule::from_code(py, sabre_code, c_str!("c2po/sabre.py"), c_str!("c2po.sabre"))?;
        
        PyModule::from_code(py, main_code, c_str!("c2po/main.py"), c_str!("c2po.main"))?;
        let compile_py = PyModule::from_code(py, compile_code, c_str!("c2po/main_wrapper.py"), c_str!("c2po.main_wrapper"))?;

        // Call main_rs function
        let args = (
            spec_filename,
            trace_filename,
            map_filename,
            output_filename,
            write_bounds_filename,
            enable_booleanizer,
            enable_aux,
            enable_rewrite,
            enable_cse,
            enable_sat,
            timeout_sat,
        );
        let result: Bound<'_, PyAny> = compile_py.getattr("compile_and_log")?.call1(args)?;
        let result_tuple = result.cast_into::<PyTuple>()?;
        let result_code = result_tuple.get_item(0)?;
        let result_output = result_tuple.get_item(1)?;
        assembly = result_output.to_string();
        if result_code.to_string() != "ReturnCode.SUCCESS" {
            println!("Compilation failed!");
            Err(PyTypeError::new_err("Compilation failed!"))
        } else {
            Ok(())
        }
    });
    if from_python.is_err(){
        println!("There was an error!");
        return (assembly, true);
    } else {
        return (assembly, false);
    }
}