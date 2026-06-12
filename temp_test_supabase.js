const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tzsglayusbbaajvsohtn.supabase.co';
const supabaseKey = 'sb_publishable_fKtzX1kqT-2Qfi2j_aQoUQ_8dZFCmIa';
const supabase = createClient(supabaseUrl, supabaseKey);

async function insertSampleBlotter() {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const entryNo = `BL-${todayStr}-0001`;

    const sampleData = {
        entry_no: entryNo,
        incident_type: 'Vehicular Accident',
        datetime_reported: new Date().toISOString(),
        datetime_occurrence: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
        municipality: 'Barbaza',
        location: 'Centro',
        street: 'National Highway',
        severity: 'Moderate',
        status: 'Under Investigation',
        reporting_officer: 'Officer Bernie Jay Manalo',
        
        // Complainant Details (Item A)
        rep_first_name: 'Juan',
        rep_last_name: 'Dela Cruz',
        rep_middle_name: 'Santos',
        rep_nickname: 'Noynoy',
        rep_age: 35,
        rep_gender: 'Male',
        rep_civil_status: 'Married',
        rep_citizenship: 'Filipino',
        rep_contact: '09171234567',
        rep_email: 'juan.delacruz@example.com',
        rep_address: 'Centro, Barbaza, Antique',
        rep_occupation: 'Driver',
        rep_education: 'High School Graduate',
        
        // Suspect Details (Item B)
        sus_first_name: 'Pedro',
        sus_last_name: 'Penduko',
        sus_middle_name: 'Alvarez',
        sus_nickname: 'Pedro',
        sus_age: 28,
        sus_gender: 'Male',
        sus_influence: 'Liquor',
        sus_address: 'San Roque, Barbaza, Antique',
        sus_physical: 'Medium build, tattoo on left arm',
        sus_marks: 'Scar near left eye',
        
        // Victim Details (Item C)
        vic_first_name: 'Maria',
        vic_last_name: 'Clara',
        vic_middle_name: 'Ibarra',
        vic_nickname: 'Mary',
        vic_age: 30,
        vic_gender: 'Female',
        vic_contact: '09209876543',
        vic_address: 'Centro, Barbaza, Antique',
        vic_blood_type: 'O+',
        vic_medical: 'Asthma',
        vic_emergency_name: 'Crisostomo Ibarra',
        vic_emergency_phone: '09155551234',
        
        // Narrative (Item D)
        narrative: 'At approximately 6:30 PM, a collision occurred along the National Highway in Barangay Centro, Barbaza. A sedan driven by Pedro Penduko collided with a motorcycle driven by Maria Clara. The suspect, Pedro Penduko, appeared to be under the influence of liquor at the time of the incident. The victim, Maria Clara, sustained minor bruises and was given medical attention.'
    };

    console.log(`Inserting sample blotter entry: ${entryNo}...`);
    try {
        const { data, error } = await supabase
            .from('police_blotters')
            .insert([sampleData])
            .select();

        if (error) {
            console.error('Insertion failed:', error.message);
            console.error('Details:', error.details || error);
            console.log('\nMake sure you have run the SQL script to create the police_blotters table first!');
            return;
        }

        console.log('Success! Sample blotter entry stored successfully.');
        console.log('Inserted record:', data);
    } catch (err) {
        console.error('Unexpected error:', err.message);
    }
}

insertSampleBlotter();
