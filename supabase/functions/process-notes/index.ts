import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { patientData, noteText } = await req.json();

    if (!noteText || !patientData) {
      return new Response(
        JSON.stringify({ error: 'Patient data and note text are required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`Processing notes for patient: ${patientData.name}`);
    console.log(`Note text: ${noteText.substring(0, 100)}...`);

    // Build context from patient data
    const patientContext = `
Patient: ${patientData.name}
Age: ${patientData.data.age}
Room: ${patientData.data.room}
Diagnosis: ${patientData.data.diagnosis}
Admitted: ${patientData.data.admittedAt}

Current Medications: ${(patientData.data.medications || []).join(', ')}

Medical History: ${(patientData.data.medicalHistory || []).join(', ')}

Recent Vitals:
- Blood Pressure: ${patientData.data.vitals?.bloodPressure || 'N/A'}
- Heart Rate: ${patientData.data.vitals?.heartRate || 'N/A'}
- Temperature: ${patientData.data.vitals?.temperature || 'N/A'}
- O2 Saturation: ${patientData.data.vitals?.oxygenSaturation || 'N/A'}

Previous Notes: ${(patientData.data.notes || []).join('; ')}
`;

    const systemPrompt = `You are an AI medical assistant helping doctors manage patient care. Your role is to analyze doctor's notes and patient records to suggest appropriate medical tasks.

Based on the patient's condition, diagnosis, current treatment, and the doctor's new notes, suggest 2-5 actionable tasks that should be performed.

Consider:
- Lab tests that might be needed based on the diagnosis and treatment
- Imaging studies for monitoring progress
- Medication adjustments or new prescriptions
- Consultations with specialists
- Procedures or interventions
- Nutritional or therapy consultations
- Follow-up appointments

Each task should be:
- Specific and actionable
- Appropriate for the patient's condition
- Prioritized (High/Medium/Low) based on urgency
- Assigned to the correct department

Return ONLY actionable medical tasks. Do not include explanations or notes about the patient's condition.`;

    const userPrompt = `${patientContext}

NEW DOCTOR'S NOTE:
${noteText}

Based on this information, what medical tasks should be performed for this patient?`;

    // Call Lovable AI with tool calling for structured output
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_tasks',
              description: 'Generate medical task suggestions for patient care',
              parameters: {
                type: 'object',
                properties: {
                  tasks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: {
                          type: 'string',
                          enum: ['Lab Test', 'Imaging', 'Medication', 'Consultation', 'Procedure', 'Nutrition'],
                          description: 'The type of medical task'
                        },
                        description: {
                          type: 'string',
                          description: 'Detailed description of the task to be performed'
                        },
                        priority: {
                          type: 'string',
                          enum: ['High', 'Medium', 'Low'],
                          description: 'The urgency/priority level of the task'
                        },
                        department: {
                          type: 'string',
                          description: 'The medical department responsible (e.g., Laboratory, Radiology, Pharmacy, etc.)'
                        }
                      },
                      required: ['type', 'description', 'priority', 'department'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['tasks'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_tasks' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 429,
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to your workspace.' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 402,
          }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status} ${errorText}`);
    }

    const aiResponse = await response.json();
    console.log('AI Response:', JSON.stringify(aiResponse));

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      throw new Error('No tool call in AI response');
    }

    const taskSuggestions = JSON.parse(toolCall.function.arguments);
    
    // Add IDs to tasks
    const tasksWithIds = taskSuggestions.tasks.map((task: any, index: number) => ({
      id: `task-${Date.now()}-${index}`,
      ...task
    }));

    console.log(`Generated ${tasksWithIds.length} task suggestions`);

    return new Response(
      JSON.stringify({
        success: true,
        suggestedTasks: tasksWithIds,
        updatedRecord: {
          addedNote: noteText
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in process-notes function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
