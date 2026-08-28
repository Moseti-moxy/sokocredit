from app import create_app
from flask import jsonify

app = create_app()

@app.route('/')
def health_check():
    return jsonify({
        "status": "success",
        "message": "Sokocredit API is online",
        "version": "1.0.0"
    }), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)