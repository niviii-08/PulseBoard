from fastapi import APIRouter, Query

router = APIRouter()

STATE_MAPPING = {
    "Tamil Nadu": [
        {"id": "all", "label": "🔥 All TN Feeds", "type": "all"},
        {"id": "x_tamil", "label": "𝕏 #TamilTwitter Memes", "type": "x"},
        {"id": "yt_tamil_cinema", "label": "▶ Kollywood YT Top Comments", "type": "youtube"},
        {"id": "kollywood", "label": "🍿 r/kollywood (Reddit)", "type": "reddit"},
        {"id": "x_kollywood_tea", "label": "𝕏 Kollywood BoxOffice & Tea", "type": "x"},
        {"id": "yt_tamil_roast", "label": "▶ Tamil Roast Channel Comments", "type": "youtube"},
        {"id": "yt_parithabangal", "label": "▶ Parithabangal Middle-Class Roasts", "type": "youtube"},
        {"id": "Chennai", "label": "🌊 r/Chennai (Reddit)", "type": "reddit"},
        {"id": "kuttichevuru", "label": "🔥 r/kuttichevuru (Reddit)", "type": "reddit"},
        {"id": "tamilmemes", "label": "📸 #tamilmemes (Instagram)", "type": "instagram"},
    ],
    "Maharashtra": [
        {"id": "all", "label": "🔥 All MH Feeds", "type": "all"},
        {"id": "x_mumbai", "label": "𝕏 #MumbaiTwitter Memes", "type": "x"},
        {"id": "yt_mumbai_street", "label": "▶ Mumbai Food & Comedy Comments", "type": "youtube"},
        {"id": "mumbai", "label": "🏙️ r/mumbai (Reddit)", "type": "reddit"},
        {"id": "x_bolly_tea", "label": "𝕏 Bollywood Tea on X", "type": "x"},
        {"id": "yt_standup_comments", "label": "▶ Standup Video Top Comments", "type": "youtube"},
        {"id": "BollyBlindsNGossip", "label": "☕ BollyBlinds (Reddit)", "type": "reddit"},
        {"id": "pune", "label": "🏰 r/pune (Reddit)", "type": "reddit"},
    ],
    "Karnataka": [
        {"id": "all", "label": "🔥 All KA Feeds", "type": "all"},
        {"id": "x_bangalore", "label": "𝕏 #PeakBengaluru on X", "type": "x"},
        {"id": "yt_bangalore_tech", "label": "▶ Tech Vlogs YouTube Comments", "type": "youtube"},
        {"id": "bangalore", "label": "🍺 r/bangalore (Reddit)", "type": "reddit"},
        {"id": "x_kannada_trends", "label": "𝕏 Sandalwood & Bengaluru X", "type": "x"},
        {"id": "ChitraLoka", "label": "🍿 r/ChitraLoka (Reddit)", "type": "reddit"},
    ],
    "Delhi": [
        {"id": "all", "label": "🔥 All Delhi Feeds", "type": "all"},
        {"id": "x_delhi", "label": "𝕏 #DilliTwitter Hot Takes", "type": "x"},
        {"id": "yt_delhi_roasts", "label": "▶ Dilli Roasters Top Comments", "type": "youtube"},
        {"id": "delhi", "label": "🥟 r/delhi (Reddit)", "type": "reddit"},
        {"id": "x_ncr_memes", "label": "𝕏 Gurgaon & NCR Twitter", "type": "x"},
        {"id": "gurgaon", "label": "🏢 r/gurgaon (Reddit)", "type": "reddit"},
    ],
    "Kerala": [
        {"id": "all", "label": "🔥 All Kerala Feeds", "type": "all"},
        {"id": "x_kerala", "label": "𝕏 #MalluTwitter & Cinema X", "type": "x"},
        {"id": "yt_kerala_trolls", "label": "▶ Malayalam Trolls YT Comments", "type": "youtube"},
        {"id": "Kerala", "label": "🌴 r/Kerala (Reddit)", "type": "reddit"},
        {"id": "MalayalamMovies", "label": "🎬 r/MalayalamMovies (Reddit)", "type": "reddit"},
    ],
    "Telangana": [
        {"id": "all", "label": "🔥 All TG Feeds", "type": "all"},
        {"id": "x_hyderabad", "label": "𝕏 #HyderabadTwitter Memes", "type": "x"},
        {"id": "yt_tollywood_comments", "label": "▶ Tollywood Trailers Top Comments", "type": "youtube"},
        {"id": "hyderabad", "label": "🍛 r/hyderabad (Reddit)", "type": "reddit"},
        {"id": "tollywood", "label": "🎬 r/tollywood (Reddit)", "type": "reddit"},
        {"id": "Ni_Bondha", "label": "🔥 r/Ni_Bondha (Reddit)", "type": "reddit"},
    ],
    "Gujarat": [
        {"id": "all", "label": "🔥 All GJ Feeds", "type": "all"},
        {"id": "x_gujarat", "label": "𝕏 #AmdavadTwitter Memes", "type": "x"},
        {"id": "yt_gujarati_comedy", "label": "▶ Gujarati Comedy YT Comments", "type": "youtube"},
        {"id": "ahmedabad", "label": "🥨 r/ahmedabad (Reddit)", "type": "reddit"},
    ],
    "West Bengal": [
        {"id": "all", "label": "🔥 All WB Feeds", "type": "all"},
        {"id": "x_kolkata", "label": "𝕏 #KolkataTwitter Adda", "type": "x"},
        {"id": "yt_bengali_roasts", "label": "▶ Bengali Roasts Top Comments", "type": "youtube"},
        {"id": "kolkata", "label": "🚋 r/kolkata (Reddit)", "type": "reddit"},
    ],
    "Uttar Pradesh": [
        {"id": "all", "label": "🔥 All UP Feeds", "type": "all"},
        {"id": "x_up", "label": "𝕏 #UPTwitter Memes", "type": "x"},
        {"id": "yt_up_comedy", "label": "▶ Desi UP Roasts YT Comments", "type": "youtube"},
        {"id": "uttarpradesh", "label": "𝛙 r/uttarpradesh (Reddit)", "type": "reddit"},
        {"id": "lucknow", "label": "🍢 r/lucknow (Reddit)", "type": "reddit"},
    ]
}

GENERAL_SOURCES = [
    {"id": "all", "label": "🔥 All India Cross-Platform", "type": "all"},
    {"id": "x_viral_india", "label": "𝕏 Viral Indian Tweets & Ratios", "type": "x"},
    {"id": "yt_viral_comments", "label": "▶ YouTube Top Roast Comments", "type": "youtube"},
    {"id": "yt_standup_comments", "label": "▶ Standup Comedy Video Top Roasts", "type": "youtube"},
    {"id": "yt_college_exams", "label": "▶ Engineering & College Exam Roasts", "type": "youtube"},
    {"id": "yt_desi_podcast_roast", "label": "▶ Desi Podcast & Founder Roasts", "type": "youtube"},
    {"id": "x_cricket_shitpost", "label": "𝕏 Cricket Twitter Hot Takes", "type": "x"},
    {"id": "yt_genz_brainrot", "label": "▶ Gen-Z Brainrot YouTube Comments", "type": "youtube"},
    {"id": "IndianDankMemes", "label": "🇮🇳 Dank India (Reddit)", "type": "reddit"},
    {"id": "IndiaMemes", "label": "😂 India Memes (Reddit)", "type": "reddit"},
    {"id": "CricketShitpost", "label": "🏏 Cricket Shitpost (Reddit)", "type": "reddit"},
    {"id": "bollywoodmemes", "label": "🎬 Bollywood Memes (Reddit)", "type": "reddit"},
    {"id": "BollyBlindsNGossip", "label": "☕ BollyBlinds (Reddit)", "type": "reddit"},
]

@router.get("/sources", summary="Get personalized meme sources based on state")
async def get_meme_sources(state: str = Query(default=None)):
    sources = []
    seen = set()
    
    # Add state specific sources if they exist
    if state and state in STATE_MAPPING:
        for s in STATE_MAPPING[state]:
            if s["id"] not in seen:
                sources.append(s)
                seen.add(s["id"])
        
    # Append general sources
    for s in GENERAL_SOURCES:
        if s["id"] not in seen:
            sources.append(s)
            seen.add(s["id"])
    
    return {"sources": sources, "state_applied": state}
